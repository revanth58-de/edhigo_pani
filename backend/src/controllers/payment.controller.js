const prisma = require('../config/database');
const { logger } = require('../middleware/errorHandler');

// POST /api/payments - Make a payment
const makePayment = async (req, res, next) => {
  try {
    const { jobId, amount, method, transactionId } = req.body;
    const farmerId = req.user.id; // From JWT token

    logger.info('Payment request received', { farmerId, jobId, amount, method });

    // Validation
    if (!jobId || !amount || !method) {
      return res.status(400).json({
        error: 'Job ID, amount, and payment method are required',
      });
    }

    const validMethods = ['cash', 'upi'];
    if (!validMethods.includes(method)) {
      return res.status(400).json({
        error: `Invalid method. Must be one of: ${validMethods.join(', ')}`,
      });
    }

    // Check if job exists and verify ownership
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Security: only the farmer who owns this job can make payments for it
    if (job.farmerId !== farmerId) {
      return res.status(403).json({ error: 'Not authorized to make payment for this job' });
    }

    // SEC-8 FIX: Prevent duplicate payments — reject if payment already completed for this job
    const existingPayment = await prisma.payment.findFirst({
      where: { jobId, farmerId, status: 'completed' },
    });
    if (existingPayment) {
      return res.status(409).json({ error: 'Payment has already been processed for this job' });
    }

    // Find worker(s) for this job via attendance records
    const attendances = await prisma.attendance.findMany({
      where: { jobId },
      select: { workerId: true },
    });

    if (attendances.length === 0) {
      return res.status(400).json({ error: 'No workers found for this job' });
    }

    // Create payment records for each worker
    const payments = [];
    const rawPerWorker = amount / attendances.length;
    const perWorkerAmount = Math.round(rawPerWorker * 100) / 100; // round to 2 decimal places

    for (const att of attendances) {
      const payment = await prisma.payment.create({
        data: {
          jobId,
          farmerId,
          workerId: att.workerId,
          amount: perWorkerAmount,
          method,
          upiRef: transactionId || null,
          status: method === 'cash' ? 'completed' : 'pending',
          paidAt: method === 'cash' ? new Date() : null,
        },
      });
      payments.push(payment);
    }

    logger.info('Payments created', { count: payments.length, jobId });

    res.json({
      message: 'Payment processed successfully',
      payments,
      totalAmount: amount,
      workerCount: attendances.length,
    });
  } catch (error) {
    logger.error('Make payment error', { message: error.message });
    next(error);
  }
};

// GET /api/payments/history/:userId - Get payment history for the authenticated user
const getPaymentHistory = async (req, res, next) => {
  try {
    // Always use the authenticated user's own ID — never trust userId from params (IDOR fix)
    const userId = req.user.id;

    // Get payments where user is farmer or worker
    const payments = await prisma.payment.findMany({
      where: {
        OR: [{ farmerId: userId }, { workerId: userId }],
      },
      include: {
        job: {
          select: {
            id: true,
            workType: true,
            payPerDay: true,
          },
        },
        farmer: {
          select: { id: true, name: true, phone: true },
        },
        worker: {
          select: { id: true, name: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      payments,
      count: payments.length,
    });
  } catch (error) {
    logger.error('Get payment history error', { message: error.message });
    next(error);
  }
};

// GET /api/payments/:paymentId - Get payment details
const getPaymentDetails = async (req, res, next) => {
  try {
    const { paymentId } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        job: true,
        farmer: {
          select: { id: true, name: true, phone: true },
        },
        worker: {
          select: { id: true, name: true, phone: true },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Authorization: only the farmer or worker involved can view this payment
    const userId = req.user.id;
    if (payment.farmerId !== userId && payment.workerId !== userId) {
      return res.status(403).json({ error: 'Not authorized to view this payment' });
    }

    res.json({ payment });
  } catch (error) {
    logger.error('Get payment details error', { message: error.message });
    next(error);
  }
};

// PATCH /api/payments/:jobId/confirm - Farmer manually confirms UPI payment received
// This is the fix for UPI payments being stuck in "pending" forever.
const confirmPayment = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { upiRef } = req.body;     // Optional: UPI transaction reference number
    const farmerId = req.user.id;

    // Verify the job belongs to this farmer
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.farmerId !== farmerId) {
      return res.status(403).json({ error: 'Not authorized to confirm payment for this job' });
    }

    // Mark all pending UPI payments for this job as completed
    const result = await prisma.payment.updateMany({
      where: { jobId, farmerId, status: 'pending', method: 'upi' },
      data: {
        status: 'completed',
        paidAt: new Date(),
        ...(upiRef && { upiRef }),
      },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'No pending UPI payments found for this job' });
    }

    logger.info('UPI payments confirmed', { jobId, farmerId, count: result.count });

    res.json({
      message: `${result.count} UPI payment(s) confirmed successfully`,
      confirmedCount: result.count,
    });
  } catch (error) {
    logger.error('Confirm payment error', { message: error.message });
    next(error);
  }
};

module.exports = { makePayment, getPaymentHistory, getPaymentDetails, confirmPayment };
