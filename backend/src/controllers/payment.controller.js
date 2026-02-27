const prisma = require('../config/database');

// POST /api/payments - Make a payment
const makePayment = async (req, res, next) => {
  try {
    const { jobId, amount, method, transactionId } = req.body;
    const farmerId = req.user.id; // From JWT token

    console.log('💰 Payment Request:', { farmerId, jobId, amount, method });

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

    // Check if job exists
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
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
    const perWorkerAmount = amount / attendances.length;

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

    console.log('✅ Payment(s) created:', payments.length);

    res.json({
      message: 'Payment processed successfully',
      payments,
      totalAmount: amount,
      workerCount: attendances.length,
    });
  } catch (error) {
    console.error('💥 Payment Error:', error);
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
    console.error('💥 Get Payment History Error:', error);
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

    res.json({ payment });
  } catch (error) {
    console.error('💥 Get Payment Details Error:', error);
    next(error);
  }
};

module.exports = { makePayment, getPaymentHistory, getPaymentDetails };
