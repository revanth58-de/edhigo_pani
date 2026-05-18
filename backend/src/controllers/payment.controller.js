const prisma = require('../config/database');
const { logger } = require('../middleware/errorHandler');
const { PaymentStatus, PaymentMethod } = require('../config/enums'); // D1

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

    const validMethods = Object.values(PaymentMethod); // D1: derived from enum, not hardcoded
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

    // FIX #4: Validate amount is not absurdly low.
    // The submitted amount must be at least payPerDay per worker to prevent
    // farmers from submitting ₹0.01 payments that pass silently.
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }
    const minExpectedAmount = job.payPerDay; // at least 1 day's pay for 1 worker
    if (parsedAmount < minExpectedAmount) {
      return res.status(400).json({
        error: `Amount ₹${parsedAmount} is below the minimum of ₹${minExpectedAmount} (job rate: ₹${job.payPerDay}/day)`,
      });
    }

    // Ensure we only pay each unique worker once per payment request
    const attendances = await prisma.attendance.findMany({
      where: { jobId },
      select: { workerId: true },
      distinct: ['workerId'],
    });

    if (attendances.length === 0) {
      return res.status(400).json({ error: 'No workers found for this job' });
    }

    // Check if we already created a pending UPI payment for this transaction reference
    if (transactionId) {
      const duplicateUPI = await prisma.payment.findFirst({
        where: { jobId, upiRef: transactionId }
      });
      if (duplicateUPI) {
         return res.status(409).json({ error: 'A payment with this UPI reference already exists' });
      }
    }

    // B5 FIX: Guard against double-payment for the same job+farmer combination.
    // Without this, a farmer double-tapping "Pay" would create two full payment batches.
    const existingCompleted = await prisma.payment.findFirst({
      where: { jobId, farmerId, status: PaymentStatus.COMPLETED },
      select: { id: true, createdAt: true },
    });
    if (existingCompleted) {
      return res.status(409).json({
        error: 'Payment already completed for this job. Use the confirm endpoint to update UPI status.',
        existingPaymentId: existingCompleted.id,
      });
    }

    // Create payment records for each distinct worker
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
          status: method === PaymentMethod.CASH ? PaymentStatus.COMPLETED : PaymentStatus.PENDING,
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
      where: { jobId, farmerId, status: PaymentStatus.PENDING, method: PaymentMethod.UPI },
      data: {
        status:  PaymentStatus.COMPLETED,
        paidAt:  new Date(),
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
