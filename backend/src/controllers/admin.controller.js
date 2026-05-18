const prisma = require('../config/database');
const { JobStatus, PaymentStatus } = require('../config/enums'); // D1

// ─────────────────────────────────────────────────────────────────────────────
// DDIA: Separate OLAP (analytical) reads from OLTP (transactional) writes.
// The /stats endpoint runs 9 heavy COUNT/GROUP BY aggregations which scan the
// entire database. Without caching this degrades real-time user requests.
//
// Strategy: in-process LRU cache with a 5-minute TTL. On cache hit we return
// instantly without touching the DB. Cache is invalidated any time an admin
// calls DELETE/PATCH on a resource, or via the explicit POST /stats/invalidate.
// ─────────────────────────────────────────────────────────────────────────────
const STATS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let _statsCache = null;    // { data, expiresAt }

function getCachedStats() {
  if (_statsCache && Date.now() < _statsCache.expiresAt) return _statsCache.data;
  return null;
}

function setCachedStats(data) {
  _statsCache = { data, expiresAt: Date.now() + STATS_CACHE_TTL_MS };
}

function invalidateStatsCache() {
  _statsCache = null;
}

// ─── Helper: build a bounded pagination object from query params ───────────
// DDIA: Every list query MUST be bounded. Unbounded findMany() on large tables
// exhausts Node.js heap and causes full-table scans on Postgres.
function getPagination(query, defaultLimit = 50, maxLimit = 100) {
  const take = Math.min(parseInt(query.limit) || defaultLimit, maxLimit);
  const skip = (Math.max(parseInt(query.page) || 1, 1) - 1) * take;
  return { take, skip, page: Math.max(parseInt(query.page) || 1, 1) };
}

// ─── GET /api/admin/stats ───
const getStats = async (req, res, next) => {
  try {
    // DDIA: Return cached stats immediately if still fresh.
    const cached = getCachedStats();
    if (cached) {
      res.setHeader('X-Stats-Cache', 'HIT');
      return res.json(cached);
    }

    // FIX #5: Compute real 7-day window so the dashboard can show
    // actual week-over-week growth instead of hardcoded fake percentages.
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    // Cache miss — run all aggregations in parallel against the live DB.
    const [
      totalUsers,
      usersByRole,
      totalJobs,
      jobsByStatus,
      totalPayments,
      paymentStats,
      totalAttendance,
      totalRatings,
      totalGroups,
      // 7-day windows (current week)
      newUsersThisWeek,
      newJobsThisWeek,
      revenueThisWeek,
      // 7-day windows (previous week for % change)
      newUsersLastWeek,
      newJobsLastWeek,
      revenueLastWeek,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({ by: ['role'], _count: true }),
      prisma.job.count(),
      prisma.job.groupBy({ by: ['status'], _count: true }),
      prisma.payment.count(),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: PaymentStatus.COMPLETED } }),
      prisma.attendance.count(),
      prisma.rating.count(),
      prisma.group.count(),
      // Current week
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.job.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: PaymentStatus.COMPLETED, createdAt: { gte: sevenDaysAgo } } }),
      // Previous week
      prisma.user.count({ where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
      prisma.job.count({ where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: PaymentStatus.COMPLETED, createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
    ]);

    const roleMap = {};
    for (const r of usersByRole) roleMap[r.role || 'unknown'] = r._count;

    const statusMap = {};
    for (const s of jobsByStatus) statusMap[s.status] = s._count;

    // Compute real % changes (avoid division by zero)
    const pct = (curr, prev) => prev === 0 ? null : Math.round(((curr - prev) / prev) * 100);
    const thisWeekRevenue = revenueThisWeek._sum.amount || 0;
    const lastWeekRevenue = revenueLastWeek._sum.amount || 0;

    const payload = {
      users: { total: totalUsers, byRole: roleMap },
      jobs: { total: totalJobs, byStatus: statusMap },
      payments: {
        total: totalPayments,
        revenue: paymentStats._sum.amount || 0,
      },
      attendance: totalAttendance,
      ratings: totalRatings,
      groups: totalGroups,
      // FIX #5: Real week-over-week growth metrics
      growth: {
        users:   { thisWeek: newUsersThisWeek,  prevWeek: newUsersLastWeek,  pctChange: pct(newUsersThisWeek, newUsersLastWeek) },
        jobs:    { thisWeek: newJobsThisWeek,   prevWeek: newJobsLastWeek,   pctChange: pct(newJobsThisWeek, newJobsLastWeek) },
        revenue: { thisWeek: thisWeekRevenue,   prevWeek: lastWeekRevenue,   pctChange: pct(thisWeekRevenue, lastWeekRevenue) },
      },
      _cachedAt: new Date().toISOString(),
    };

    setCachedStats(payload);
    res.setHeader('X-Stats-Cache', 'MISS');
    res.json(payload);
  } catch (err) { next(err); }
};

// ─── POST /api/admin/stats/invalidate ───
// Allows an admin to force-refresh stats without waiting for TTL expiry.
const invalidateStats = (req, res) => {
  invalidateStatsCache();
  res.json({ message: 'Stats cache invalidated. Next request will recompute from DB.' });
};

// ─── GET /api/admin/stats/activity ───
// FIX #6: Returns daily job creation counts for the last 7 days.
// Used to draw the weekly activity chart with real data instead of fake values.
// Uses raw SQL grouping by day to avoid pulling all rows into Node memory.
const getActivity = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Raw query: group jobs by calendar day using Postgres date_trunc.
    // This runs a single indexed scan instead of fetching all rows.
    const rows = await prisma.$queryRaw`
      SELECT
        TO_CHAR(DATE_TRUNC('day', "createdAt" AT TIME ZONE 'Asia/Kolkata'), 'Dy') AS label,
        EXTRACT(DOW FROM "createdAt" AT TIME ZONE 'Asia/Kolkata')::int            AS dow,
        COUNT(*)::int                                                              AS jobs,
        COALESCE(SUM("payPerDay"), 0)::float                                       AS revenue
      FROM jobs
      WHERE "createdAt" >= ${since}
      GROUP BY DATE_TRUNC('day', "createdAt" AT TIME ZONE 'Asia/Kolkata'), dow
      ORDER BY DATE_TRUNC('day', "createdAt" AT TIME ZONE 'Asia/Kolkata')
    `;

    // Build a full 7-slot array (Mon-Sun) filling zeros for days with no jobs.
    const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const byDow = {};
    for (const r of rows) byDow[r.dow] = { jobs: r.jobs, revenue: r.revenue, label: r.label };

    // Return 7 entries starting from today − 6 days
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dow = d.getDay();
      result.push({
        label: DAY_LABELS[dow],
        dow,
        jobs: byDow[dow]?.jobs || 0,
        revenue: byDow[dow]?.revenue || 0,
        isToday: i === 0,
      });
    }

    res.json({ activity: result, days });
  } catch (err) { next(err); }
};

// ─── GET /api/admin/users ───
const getUsers = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 50 } = req.query;
    // SEC-9 FIX: Cap page size at 100 to prevent full-table data dumps
    const take = Math.min(parseInt(limit) || 50, 100);
    const skip = (Math.max(parseInt(page), 1) - 1) * take;

    const where = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { village: { contains: search } },
      ];
    }
    // S4: Exclude soft-deleted users from the default listing
    where.deletedAt = null;
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, phone: true, name: true, role: true,
          language: true, village: true, status: true,
          ratingAvg: true, ratingCount: true, createdAt: true,
          landAcres: true, photoUrl: true,
          _count: { select: { jobsPosted: true, attendances: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.user.count({ where }),
    ]);
    res.json({ users, count: users.length, total, page: parseInt(page), pages: Math.ceil(total / take) });
  } catch (err) { next(err); }
};

// ─── PATCH /api/admin/users/:id ───
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, role, status, village, landAcres } = req.body;
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
        ...(status !== undefined && { status }),
        ...(village !== undefined && { village }),
        ...(landAcres !== undefined && { landAcres: parseFloat(landAcres) }),
      },
    });
    res.json({ user });
  } catch (err) { next(err); }
};

// ─── DELETE /api/admin/users/:id ───
// S4 FIX: Use soft-delete instead of hard-delete.
// Hard-deleting a User cascades deletions on Job, Payment, Rating, etc.,
// causing data loss and breaking audit trails. Instead, set deletedAt timestamp
// and status = 'suspended', which blocks login while preserving all history.
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'suspended',
        otp: null,           // invalidate any active OTP
        otpExpiresAt: null,
      },
    });
    // Revoke all refresh tokens so the user is immediately signed out everywhere
    await prisma.refreshToken.updateMany({
      where: { userId: id },
      data:  { revoked: true },
    });
    res.json({ message: 'User suspended and access revoked', userId: id });
  } catch (err) { next(err); }
};

// ─── PATCH /api/admin/users/:id/suspend ───
// A3: Toggle suspend/unsuspend without destroying the row.
const suspendUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { suspend } = req.body; // true = suspend, false = reinstate

    const data = suspend
      ? { status: 'suspended', deletedAt: new Date() }
      : { status: 'offline',   deletedAt: null };

    const user = await prisma.user.update({ where: { id }, data });

    if (suspend) {
      // Sign the user out everywhere
      await prisma.refreshToken.updateMany({
        where: { userId: id },
        data:  { revoked: true },
      });
    }

    res.json({
      message: suspend ? 'User suspended' : 'User reinstated',
      user: { id: user.id, status: user.status },
    });
  } catch (err) { next(err); }
};

// ─── GET /api/admin/jobs ───
// DDIA: Bounded with server-side pagination.
const getJobs = async (req, res, next) => {
  try {
    const { status, workType } = req.query;
    const { take, skip, page } = getPagination(req.query);

    const where = {};
    // FIX #2: Map the admin UI's convenience alias ?status=open to the actual
    // schema values used in the database. The admin page always passes 'open'
    // but the Job model uses 'pending', 'matched', 'in_progress' for live jobs.
    if (status === 'open') {
      where.status = { in: JobStatus.LIVE };
    } else if (status) {
      where.status = status;
    }
    if (workType) where.workType = workType;

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          farmer: { select: { id: true, name: true, phone: true, village: true } },
          _count: { select: { attendances: true, applications: true, payments: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.job.count({ where }),
    ]);
    res.json({ jobs, count: jobs.length, total, page, pages: Math.ceil(total / take) });
  } catch (err) { next(err); }
};

// ─── PATCH /api/admin/jobs/:id ───
const updateJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const job = await prisma.job.update({
      where: { id },
      data: { ...(status && { status }) },
    });
    res.json({ job });
  } catch (err) { next(err); }
};

// ─── GET /api/admin/payments ───
// DDIA: Bounded with server-side pagination. Payments table is a high-growth
// append-only ledger. Without limits a single request could return millions of rows.
const getPayments = async (req, res, next) => {
  try {
    const { status, method } = req.query;
    const { take, skip, page } = getPagination(req.query);

    const where = {};
    if (status) where.status = status;
    if (method) where.method = method;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          farmer: { select: { id: true, name: true, phone: true } },
          worker: { select: { id: true, name: true, phone: true } },
          job: { select: { id: true, workType: true, payPerDay: true, farmAddress: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.payment.count({ where }),
    ]);
    res.json({ payments, count: payments.length, total, page, pages: Math.ceil(total / take) });
  } catch (err) { next(err); }
};

// ─── PATCH /api/admin/payments/:id ───
const updatePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const payment = await prisma.payment.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(status === PaymentStatus.COMPLETED && { paidAt: new Date() }),
      },
    });
    res.json({ payment });
  } catch (err) { next(err); }
};

// ─── GET /api/admin/attendance ───
const getAttendance = async (req, res, next) => {
  try {
    const records = await prisma.attendance.findMany({
      include: {
        worker: { select: { id: true, name: true, phone: true } },
        job: { select: { id: true, workType: true, farmAddress: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ records, count: records.length });
  } catch (err) { next(err); }
};

// ─── GET /api/admin/ratings ───
const getRatings = async (req, res, next) => {
  try {
    const ratings = await prisma.rating.findMany({
      include: {
        fromUser: { select: { id: true, name: true, phone: true, role: true } },
        toUser: { select: { id: true, name: true, phone: true, role: true } },
        job: { select: { id: true, workType: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ ratings, count: ratings.length });
  } catch (err) { next(err); }
};

// ─── GET /api/admin/groups ───
// DDIA: Bounded. Groups include nested member arrays — without a limit, deeply
// nested JOIN results can multiply payload size exponentially.
const getGroups = async (req, res, next) => {
  try {
    const { take, skip, page } = getPagination(req.query);

    const [groups, total] = await Promise.all([
      prisma.group.findMany({
        include: {
          leader: { select: { id: true, name: true, phone: true } },
          members: {
            include: {
              worker: { select: { id: true, name: true, phone: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.group.count(),
    ]);
    res.json({ groups, count: groups.length, total, page, pages: Math.ceil(total / take) });
  } catch (err) { next(err); }
};

// ─── Invalidate stats cache on any write operation ─────────────────────────
// DDIA: Cache invalidation on write ensures the dashboard reflects mutations
// within the next request cycle, without requiring manual cache busting.
const _withCacheInvalidation = (fn) => async (req, res, next) => {
  await fn(req, res, next);
  invalidateStatsCache();
};

module.exports = {
  getStats,
  invalidateStats,
  getActivity,
  getUsers,
  updateUser:   _withCacheInvalidation(updateUser),
  deleteUser:   _withCacheInvalidation(deleteUser),
  suspendUser:  _withCacheInvalidation(suspendUser),
  getJobs,
  updateJob:    _withCacheInvalidation(updateJob),
  getPayments,
  updatePayment: _withCacheInvalidation(updatePayment),
  getAttendance,
  getRatings,
  getGroups,
};
