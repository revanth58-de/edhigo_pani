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
      pendingPaymentStats,
      commissionStats,
      pendingSettlementStats,
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
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: PaymentStatus.PENDING } }),
      prisma.payment.aggregate({ _sum: { commissionAmount: true }, where: { status: PaymentStatus.COMPLETED } }),
      prisma.settlement.aggregate({ _sum: { amount: true }, where: { status: 'pending' } }),
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
    const pct = (prev, curr) => prev === 0 ? null : Math.round(((curr - prev) / prev) * 100);
    const thisWeekRevenue = revenueThisWeek._sum.amount || 0;
    const lastWeekRevenue = revenueLastWeek._sum.amount || 0;

    const openJobs = (statusMap['pending'] || 0) + (statusMap['matched'] || 0) + (statusMap['in_progress'] || 0);
    const doneJobs = (statusMap['completed'] || 0);

    const payload = {
      users: { total: totalUsers, byRole: roleMap },
      jobs: { total: totalJobs, byStatus: statusMap, openJobs, doneJobs },
      payments: {
        total: totalPayments,
        revenue: paymentStats._sum.amount || 0,
        pending: pendingPaymentStats._sum.amount || 0,
        commission: commissionStats._sum.commissionAmount || 0,
        pendingSettlements: pendingSettlementStats._sum.amount || 0,
      },
      attendance: totalAttendance,
      ratings: totalRatings,
      groups: totalGroups,
      // FIX #5: Real week-over-week growth metrics
      growth: {
        users:   { thisWeek: newUsersThisWeek,  prevWeek: newUsersLastWeek,  pctChange: pct(newUsersLastWeek, newUsersThisWeek) },
        jobs:    { thisWeek: newJobsThisWeek,   prevWeek: newJobsLastWeek,   pctChange: pct(newJobsLastWeek, newJobsThisWeek) },
        revenue: { thisWeek: thisWeekRevenue,   prevWeek: lastWeekRevenue,   pctChange: pct(lastWeekRevenue, thisWeekRevenue) },
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
    for (const r of rows) byDow[r.dow] = { jobs: Number(r.jobs), revenue: Number(r.revenue), label: r.label };

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
          landAcres: true, photoUrl: true, age: true, gender: true,
          experience: true, avatarIcon: true, skills: true,
          animals: { select: { type: true, count: true } },
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
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }
    const mappedStatus = status === 'active' ? 'available' : status;
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
        ...(status !== undefined && { status: mappedStatus }),
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
    // A1: Log action
    await prisma.auditLog.create({
      data: {
        adminId: req.user.id,
        action: 'delete_user',
        targetId: id,
        details: { status: 'suspended', softDeleted: true }
      }
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

    // A1: Log action
    await prisma.auditLog.create({
      data: {
        adminId: req.user.id,
        action: suspend ? 'suspend_user' : 'reinstate_user',
        targetId: id,
        details: { status: suspend ? 'suspended' : 'offline' }
      }
    });

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

// ─── GET /api/admin/audit ───
// A1: Fetch audit logs for dashboard display
const getAuditLogs = async (req, res, next) => {
  try {
    const { take, skip, page } = getPagination(req.query, 100);
    
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        include: {
          admin: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.auditLog.count(),
    ]);

    res.json({ logs, total, page, pages: Math.ceil(total / take) });
  } catch (err) { next(err); }
};

// GET /api/admin/settlements
const getSettlements = async (req, res, next) => {
  try {
    const { status } = req.query;
    const { take, skip, page } = getPagination(req.query);

    const where = {};
    if (status) where.status = status;

    const [settlements, total] = await Promise.all([
      prisma.settlement.findMany({
        where,
        include: {
          worker: { select: { id: true, name: true, phone: true, upiId: true } },
          payment: {
            include: {
              job: { select: { id: true, workType: true } },
              farmer: { select: { id: true, name: true } },
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.settlement.count({ where }),
    ]);

    res.json({ settlements, count: settlements.length, total, page, pages: Math.ceil(total / take) });
  } catch (err) { next(err); }
};

// POST /api/admin/settlements/:id/settle
const settlePayment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const settlement = await prisma.settlement.findUnique({
      where: { id }
    });

    if (!settlement) {
      return res.status(404).json({ error: 'Settlement not found' });
    }

    // Update settlement to settled
    const updatedSettlement = await prisma.settlement.update({
      where: { id },
      data: {
        status: 'settled',
        settledAt: new Date(),
      }
    });

    // Also update the corresponding payment's settlementStatus to settled
    await prisma.payment.update({
      where: { id: settlement.paymentId },
      data: {
        settlementStatus: 'settled',
      }
    });

    // Log the manual settlement in audit log
    await prisma.auditLog.create({
      data: {
        adminId: req.user.id,
        action: 'manual_settlement',
        targetId: settlement.id,
        details: { amount: settlement.amount, workerId: settlement.workerId }
      }
    });

    res.json({ message: 'Settlement processed successfully', settlement: updatedSettlement });
  } catch (err) { next(err); }
};

// ─── GET /api/admin/disputes ───
const getDisputes = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const take = Math.min(parseInt(limit) || 50, 100);
    const skip = (Math.max(parseInt(page), 1) - 1) * take;

    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { initiator: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [disputes, total] = await Promise.all([
      prisma.dispute.findMany({
        where,
        include: {
          initiator: {
            select: { id: true, name: true, phone: true, role: true }
          },
          job: {
            select: { id: true, workType: true, payPerDay: true, farmerId: true }
          },
          payment: {
            select: { id: true, amount: true, status: true, method: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.dispute.count({ where }),
    ]);

    res.json({
      disputes,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / take)
    });
  } catch (err) { next(err); }
};

// ─── PATCH /api/admin/disputes/:id ───
const updateDisputeStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, resolutionDetails } = req.body;

    const existing = await prisma.dispute.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const updated = await prisma.dispute.update({
      where: { id },
      data: {
        status,
        resolutionDetails,
        ...((status === 'resolved' || status === 'dismissed') ? { resolvedAt: new Date() } : {}),
      },
      include: {
        initiator: {
          select: { id: true, name: true, phone: true, role: true }
        }
      }
    });

    // Log this action in audit log
    await prisma.auditLog.create({
      data: {
        adminId: req.user.id,
        action: `dispute_${status}`,
        targetId: id,
        details: { category: existing.category, resolutionDetails }
      }
    });

    res.json({ message: 'Dispute updated successfully', dispute: updated });
  } catch (err) { next(err); }
};

const defaultSettings = [
  { key: 'wages.minDailyWage', value: '400' },
  { key: 'wages.enforceMinimum', value: 'true' },
  { key: 'wages.cropRates', value: JSON.stringify({ paddy_harvesting: 500, sugarcane_cutting: 600, watering: 350, ploughing: 450, cotton_picking: 480, chilli_harvesting: 520 }) },
  { key: 'rents.machineryCommission', value: '10' },
  { key: 'rents.machineryBaseRates', value: JSON.stringify({ Tractor: 800, Harvester: 1500, 'Pump Set': 200, Plough: 350, Sprayer: 250, Thresher: 900 }) },
  { key: 'app.telemetryPingInterval', value: '30' },
  { key: 'app.telemetryDistanceThreshold', value: '20' },
  { key: 'app.maintenanceMode', value: 'false' },
  { key: 'app.platformCommission', value: '5' },
  { key: 'app.notificationsEnabled', value: 'true' },
  { key: 'app.adminJobAlerts', value: 'true' }
];

const initializeSystemSettings = async () => {
  try {
    for (const item of defaultSettings) {
      const existing = await prisma.systemSetting.findUnique({ where: { key: item.key } });
      if (!existing) {
        await prisma.systemSetting.create({ data: item });
      }
    }
  } catch (err) {
    console.error('Failed to initialize settings:', err);
  }
};

const getSettings = async (req, res, next) => {
  try {
    await initializeSystemSettings();
    const settings = await prisma.systemSetting.findMany();
    const configMap = {};
    settings.forEach(s => {
      configMap[s.key] = s.value;
    });
    res.json({ settings: configMap });
  } catch (err) { next(err); }
};

const updateSettings = async (req, res, next) => {
  try {
    const updates = req.body;
    
    // Log in audit log
    await prisma.auditLog.create({
      data: {
        adminId: req.user.id,
        action: 'settings_update',
        targetId: 'system_settings',
        details: updates
      }
    });

    for (const [key, value] of Object.entries(updates)) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) }
      });
    }
    
    const settings = await prisma.systemSetting.findMany();
    const configMap = {};
    settings.forEach(s => {
      configMap[s.key] = s.value;
    });
    res.json({ message: 'Settings updated successfully', settings: configMap });
  } catch (err) { next(err); }
};

// ─── Machinery Management ───
const getMachinery = async (req, res, next) => {
  try {
    const { take, skip, page } = getPagination(req.query);
    const { type, status, search } = req.query;

    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { owner: { name: { contains: search, mode: 'insensitive' } } },
        { owner: { phone: { contains: search } } },
      ];
    }

    const [total, machinery] = await Promise.all([
      prisma.machinery.count({ where }),
      prisma.machinery.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: { id: true, name: true, phone: true, village: true }
          },
          _count: {
            select: { bookings: true }
          }
        }
      })
    ]);

    res.json({
      machinery,
      pagination: { total, page, limit: take, pages: Math.ceil(total / take) }
    });
  } catch (err) { next(err); }
};

const updateMachinery = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, pricePerHour, name, type } = req.body;

    const updated = await prisma.machinery.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(pricePerHour ? { pricePerHour: parseFloat(pricePerHour) } : {}),
        ...(name ? { name } : {}),
        ...(type ? { type } : {})
      },
      include: {
        owner: { select: { id: true, name: true, phone: true } }
      }
    });

    await prisma.auditLog.create({
      data: {
        adminId: req.user.id,
        action: 'machinery_update',
        targetId: id,
        details: { status, pricePerHour }
      }
    });

    res.json({ message: 'Machinery updated successfully', machinery: updated });
  } catch (err) { next(err); }
};

const deleteMachinery = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.machinery.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        adminId: req.user.id,
        action: 'machinery_delete',
        targetId: id,
        details: { deletedAt: new Date() }
      }
    });

    res.json({ message: 'Machinery deleted successfully' });
  } catch (err) { next(err); }
};

const getMachineryBookings = async (req, res, next) => {
  try {
    const { take, skip, page } = getPagination(req.query);
    const { status } = req.query;

    const where = {};
    if (status) where.status = status;

    const [total, bookings] = await Promise.all([
      prisma.machineryBooking.count({ where }),
      prisma.machineryBooking.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          farmer: { select: { id: true, name: true, phone: true, village: true } },
          machinery: {
            select: {
              id: true,
              name: true,
              type: true,
              pricePerHour: true,
              owner: { select: { id: true, name: true, phone: true } }
            }
          }
        }
      })
    ]);

    res.json({
      bookings,
      pagination: { total, page, limit: take, pages: Math.ceil(total / take) }
    });
  } catch (err) { next(err); }
};

// ─── Broadcast & Notifications ───
const getNotifications = async (req, res, next) => {
  try {
    const { take, skip, page } = getPagination(req.query, 20);
    const [total, notifications] = await Promise.all([
      prisma.notification.count(),
      prisma.notification.findMany({
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, phone: true, role: true } }
        }
      })
    ]);

    res.json({
      notifications,
      pagination: { total, page, limit: take, pages: Math.ceil(total / take) }
    });
  } catch (err) { next(err); }
};

const sendBroadcastNotification = async (req, res, next) => {
  try {
    const { title, body, targetRole, category = 'announcement' } = req.body;
    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required for broadcast.' });
    }

    const where = {};
    if (targetRole && targetRole !== 'all') {
      where.role = targetRole;
    }

    const targetUsers = await prisma.user.findMany({
      where,
      select: { id: true, pushToken: true, name: true }
    });

    if (targetUsers.length === 0) {
      return res.json({ message: 'No target users found for broadcast', count: 0 });
    }

    // Batch insert notifications
    const createData = targetUsers.map(u => ({
      userId: u.id,
      title,
      body,
      data: { category, broadcastAt: new Date().toISOString() }
    }));

    await prisma.notification.createMany({ data: createData });

    // Emit live via socket
    const io = req.app.get('io');
    if (io) {
      targetUsers.forEach(u => {
        io.to(`user:${u.id}`).emit('notification:new', {
          title,
          body,
          category,
          createdAt: new Date().toISOString()
        });
      });
    }

    // Log broadcast in AuditLog
    await prisma.auditLog.create({
      data: {
        adminId: req.user.id,
        action: 'broadcast_sent',
        details: { title, targetRole: targetRole || 'all', recipientCount: targetUsers.length, category }
      }
    });

    res.json({
      message: `Broadcast successfully dispatched to ${targetUsers.length} users`,
      recipientCount: targetUsers.length
    });
  } catch (err) { next(err); }
};

// ─── Admin Alerts (Real-time feed) ───
const getAdminAlerts = async (req, res, next) => {
  try {
    const [recentJobs, recentDisputes, recentUsers] = await Promise.all([
      prisma.job.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { farmer: { select: { name: true, phone: true, village: true } } }
      }),
      prisma.dispute.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { initiator: { select: { name: true, phone: true, role: true } } }
      }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, phone: true, role: true, village: true, createdAt: true }
      })
    ]);

    res.json({
      recentJobs,
      recentDisputes,
      recentUsers
    });
  } catch (err) { next(err); }
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
  getAuditLogs,
  getSettlements,
  settlePayment: _withCacheInvalidation(settlePayment),
  getDisputes,
  updateDisputeStatus: _withCacheInvalidation(updateDisputeStatus),
  getSettings,
  updateSettings,
  getMachinery,
  updateMachinery,
  deleteMachinery,
  getMachineryBookings,
  getNotifications,
  sendBroadcastNotification,
  getAdminAlerts
};
