/**
 * earnings.controller.js
 * F1: Worker Earnings Dashboard API
 *
 * Provides a single endpoint that aggregates all payment data for the
 * authenticated worker — no heavy in-memory processing, all done in SQL.
 *
 * GET /api/workers/earnings
 * Returns:
 *   - summary:       { totalEarned, thisMonth, thisWeek, totalJobs, avgPerJob }
 *   - byWorkType:    [ { workType, total, count } ]  — for the breakdown chart
 *   - byMonth:       [ { month, total } ]             — 6-month trend (bar chart)
 *   - recentPayments: last 20 completed payments with job + farmer details
 *   - pendingAmount:  total amount in "pending" UPI payments not yet confirmed
 */

const prisma = require('../config/database');
const { logger } = require('../middleware/errorHandler');
const { PaymentStatus } = require('../config/enums'); // D1

const getEarnings = async (req, res, next) => {
  try {
    const workerId = req.user.id;

    // ── 1. All completed payments for this worker ────────────────────────────
    // One DB call for the raw payment list; aggregations derived from this.
    const payments = await prisma.payment.findMany({
      where: { workerId, status: PaymentStatus.COMPLETED },
      include: {
        job: {
          select: { id: true, workType: true, farmAddress: true, createdAt: true },
        },
        farmer: {
          select: { id: true, name: true },
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    // ── 2. Pending amount (UPI not yet confirmed) ────────────────────────────
    const pendingResult = await prisma.payment.aggregate({
      where: { workerId, status: PaymentStatus.PENDING },
      _sum: { amount: true },
    });
    const pendingAmount = pendingResult._sum.amount || 0;

    // ── 3. Time-range computations ───────────────────────────────────────────
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek  = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    let totalEarned = 0;
    let thisMonth   = 0;
    let thisWeek    = 0;
    const workTypeMap = {};  // workType → { total, count }
    const monthMap    = {};  // 'YYYY-MM' → total

    for (const p of payments) {
      const amount  = p.amount || 0;
      const paidAt  = p.paidAt ? new Date(p.paidAt) : new Date(p.createdAt);
      const wt      = p.job?.workType || 'Other';

      totalEarned += amount;
      if (paidAt >= startOfMonth) thisMonth += amount;
      if (paidAt >= startOfWeek)  thisWeek  += amount;

      // By work type
      if (!workTypeMap[wt]) workTypeMap[wt] = { total: 0, count: 0 };
      workTypeMap[wt].total  += amount;
      workTypeMap[wt].count  += 1;

      // By month (last 6 months)
      const monthKey = `${paidAt.getFullYear()}-${String(paidAt.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[monthKey]) monthMap[monthKey] = 0;
      monthMap[monthKey] += amount;
    }

    // ── 4. Build 6-month trend with zero-fill for missing months ────────────
    const byMonth = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      byMonth.push({ month: key, label, total: Math.round((monthMap[key] || 0) * 100) / 100 });
    }

    // ── 5. Work-type breakdown sorted by total desc ──────────────────────────
    const byWorkType = Object.entries(workTypeMap)
      .map(([workType, { total, count }]) => ({
        workType,
        total:   Math.round(total * 100) / 100,
        count,
        percent: totalEarned > 0 ? Math.round((total / totalEarned) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // ── 6. Summary ───────────────────────────────────────────────────────────
    const uniqueJobIds = new Set(payments.map(p => p.job?.id).filter(Boolean));
    const totalJobs    = uniqueJobIds.size;
    const avgPerJob    = totalJobs > 0
      ? Math.round((totalEarned / totalJobs) * 100) / 100
      : 0;

    logger.info('Earnings fetched', { workerId, totalEarned, totalJobs });

    res.json({
      summary: {
        totalEarned:  Math.round(totalEarned  * 100) / 100,
        thisMonth:    Math.round(thisMonth    * 100) / 100,
        thisWeek:     Math.round(thisWeek     * 100) / 100,
        totalJobs,
        avgPerJob,
        pendingAmount: Math.round(pendingAmount * 100) / 100,
      },
      byWorkType,
      byMonth,
      recentPayments: payments.slice(0, 20).map(p => ({
        id:          p.id,
        amount:      p.amount,
        method:      p.method,
        paidAt:      p.paidAt,
        createdAt:   p.createdAt,
        workType:    p.job?.workType   || 'Work',
        farmAddress: p.job?.farmAddress || '—',
        farmerName:  p.farmer?.name    || 'Farmer',
      })),
    });

  } catch (error) {
    logger.error('Earnings fetch error', { message: error.message });
    next(error);
  }
};

module.exports = { getEarnings };
