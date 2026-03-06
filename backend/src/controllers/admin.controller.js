const prisma = require('../config/database');

// ─── GET /api/admin/stats ───
const getStats = async (req, res, next) => {
  try {
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
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({ by: ['role'], _count: true }),
      prisma.job.count(),
      prisma.job.groupBy({ by: ['status'], _count: true }),
      prisma.payment.count(),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'completed' },
      }),
      prisma.attendance.count(),
      prisma.rating.count(),
      prisma.group.count(),
    ]);

    const roleMap = {};
    for (const r of usersByRole) roleMap[r.role || 'unknown'] = r._count;

    const statusMap = {};
    for (const s of jobsByStatus) statusMap[s.status] = s._count;

    res.json({
      users: { total: totalUsers, byRole: roleMap },
      jobs: { total: totalJobs, byStatus: statusMap },
      payments: {
        total: totalPayments,
        revenue: paymentStats._sum.amount || 0,
      },
      attendance: totalAttendance,
      ratings: totalRatings,
      groups: totalGroups,
    });
  } catch (err) { next(err); }
};

// ─── GET /api/admin/users ───
const getUsers = async (req, res, next) => {
  try {
    const { role, search } = req.query;
    const where = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { village: { contains: search } },
      ];
    }
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, phone: true, name: true, role: true,
        language: true, village: true, status: true,
        ratingAvg: true, ratingCount: true, createdAt: true,
        landAcres: true, photoUrl: true,
        _count: { select: { jobsPosted: true, attendances: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ users, count: users.length });
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
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'User deleted successfully' });
  } catch (err) { next(err); }
};

// ─── GET /api/admin/jobs ───
const getJobs = async (req, res, next) => {
  try {
    const { status, workType } = req.query;
    const where = {};
    if (status) where.status = status;
    if (workType) where.workType = workType;

    const jobs = await prisma.job.findMany({
      where,
      include: {
        farmer: { select: { id: true, name: true, phone: true, village: true } },
        _count: { select: { attendances: true, applications: true, payments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ jobs, count: jobs.length });
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
const getPayments = async (req, res, next) => {
  try {
    const { status, method } = req.query;
    const where = {};
    if (status) where.status = status;
    if (method) where.method = method;

    const payments = await prisma.payment.findMany({
      where,
      include: {
        farmer: { select: { id: true, name: true, phone: true } },
        worker: { select: { id: true, name: true, phone: true } },
        job: { select: { id: true, workType: true, payPerDay: true, farmAddress: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ payments, count: payments.length });
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
        ...(status === 'completed' && { paidAt: new Date() }),
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
const getGroups = async (req, res, next) => {
  try {
    const groups = await prisma.group.findMany({
      include: {
        leader: { select: { id: true, name: true, phone: true } },
        members: {
          include: {
            worker: { select: { id: true, name: true, phone: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ groups, count: groups.length });
  } catch (err) { next(err); }
};

module.exports = {
  getStats, getUsers, updateUser, deleteUser,
  getJobs, updateJob,
  getPayments, updatePayment,
  getAttendance, getRatings, getGroups,
};
