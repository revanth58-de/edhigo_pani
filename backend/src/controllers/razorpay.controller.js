const crypto = require('crypto');
const prisma = require('../config/database');
const config = require('../config/env');
const { logger } = require('../middleware/errorHandler');
const { PaymentStatus, PaymentMethod } = require('../config/enums');

// POST /api/payments/razorpay/order
const createOrder = async (req, res, next) => {
  try {
    const { amount, jobId, bookingId } = req.body;
    const farmerId = req.user.id;

    if (!amount || (!jobId && !bookingId)) {
      return res.status(400).json({ error: 'Amount and either Job ID or Booking ID are required' });
    }

    const amountInPaise = Math.round(parseFloat(amount) * 100);
    if (isNaN(amountInPaise) || amountInPaise <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    // Call Razorpay REST API directly to generate order
    const auth = Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: jobId || bookingId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error('Razorpay Order Creation Failed', { status: response.status, data });
      return res.status(response.status).json({ error: data.error?.description || 'Failed to create Razorpay order' });
    }

    logger.info('Razorpay Order Created Successfully', { orderId: data.id, receipt: data.receipt });

    res.status(201).json({
      success: true,
      order: {
        id: data.id,
        amount: data.amount,
        currency: data.currency,
        key: config.razorpay.keyId
      }
    });
  } catch (error) {
    logger.error('Create Razorpay Order Error', { message: error.message });
    next(error);
  }
};

// POST /api/payments/razorpay/verify
const verifyPayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      jobId,
      bookingId,
      amount
    } = req.body;

    const farmerId = req.user.id;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || (!jobId && !bookingId)) {
      return res.status(400).json({ error: 'Missing required Razorpay verification parameters' });
    }

    // 1. Verify Signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(body)
      .digest('hex');

    const isSignatureValid = expectedSignature === razorpay_signature;

    if (!isSignatureValid) {
      logger.warn('Razorpay Signature Verification Failed', { razorpay_order_id, razorpay_payment_id });
      return res.status(400).json({ error: 'Invalid transaction signature' });
    }

    logger.info('Razorpay Signature Verified', { razorpay_order_id, razorpay_payment_id });

    const confirmId = bookingId || jobId;

    // 2. Locate or create pending payment records in database
    if (bookingId) {
      // Machinery Booking
      const booking = await prisma.machineryBooking.findUnique({
        where: { id: bookingId },
        include: { machinery: true }
      });

      if (!booking) {
        return res.status(404).json({ error: 'Machinery booking not found' });
      }

      // Check if payment already exists
      let payment = await prisma.payment.findFirst({
        where: { bookingId, farmerId }
      });

      const parsedAmount = parseFloat(amount || (booking.totalPrice || booking.price || 1000));
      let commissionPct = 0.05;
      try {
        const setting = await prisma.systemSetting.findUnique({ where: { key: 'app.platformCommission' } });
        if (setting) commissionPct = parseFloat(setting.value) / 100;
      } catch (err) {}
      
      const commissionAmount = Math.round((parsedAmount * commissionPct) * 100) / 100;
      const workerAmount = Math.round((parsedAmount - commissionAmount) * 100) / 100;

      if (!payment) {
        // Create completed payment record
        payment = await prisma.payment.create({
          data: {
            bookingId,
            farmerId,
            workerId: booking.machinery.ownerId,
            amount: parsedAmount,
            commissionAmount,
            workerAmount,
            method: PaymentMethod.CARD,
            upiRef: razorpay_payment_id,
            status: PaymentStatus.COMPLETED,
            settlementStatus: 'pending',
            paidAt: new Date()
          }
        });
      } else {
        // Update existing pending payment
        payment = await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.COMPLETED,
            paidAt: new Date(),
            upiRef: razorpay_payment_id,
            method: PaymentMethod.CARD
          }
        });
      }

      // Create settlement record
      const existingSettlement = await prisma.settlement.findFirst({
        where: { paymentId: payment.id }
      });
      if (!existingSettlement) {
        await prisma.settlement.create({
          data: {
            workerId: payment.workerId,
            paymentId: payment.id,
            amount: payment.workerAmount,
            status: 'pending'
          }
        });
      }

      // Notify machinery owner
      try {
        const { createNotification, sendPush } = require('../services/pushNotification');
        const farmer = await prisma.user.findUnique({ where: { id: farmerId }, select: { name: true } });
        const notifTitle = '💰 Payment Received!';
        const notifBody = `Farmer ${farmer?.name || 'A farmer'} paid ₹${parsedAmount} (Card/Netbanking) for your machinery booking.`;

        await createNotification(booking.machinery.ownerId, notifTitle, notifBody, {
          bookingId,
          screen: 'WorkerMachinery'
        });

        const owner = await prisma.user.findUnique({ where: { id: booking.machinery.ownerId }, select: { pushToken: true } });
        if (owner?.pushToken) {
          await sendPush(owner.pushToken, notifTitle, notifBody, {
            bookingId,
            screen: 'WorkerMachinery'
          });
        }
      } catch (notifError) {}

    } else {
      // Standard Farm Job
      const job = await prisma.job.findUnique({ where: { id: jobId } });
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      let attendances = await prisma.attendance.findMany({
        where: { jobId },
        select: { workerId: true },
        distinct: ['workerId']
      });

      if (attendances.length === 0) {
        const applications = await prisma.jobApplication.findMany({
          where: { jobId, status: 'accepted' },
          select: { workerId: true }
        });
        attendances = applications;
      }

      if (attendances.length === 0) {
        return res.status(400).json({ error: 'No workers found for this job' });
      }

      const parsedAmount = parseFloat(amount || (job.payPerDay * attendances.length));
      const perWorkerAmount = Math.round((parsedAmount / attendances.length) * 100) / 100;
      
      let commissionPct = 0.05;
      try {
        const setting = await prisma.systemSetting.findUnique({ where: { key: 'app.platformCommission' } });
        if (setting) commissionPct = parseFloat(setting.value) / 100;
      } catch (err) {}
      
      const commissionAmount = Math.round((perWorkerAmount * commissionPct) * 100) / 100;
      const workerAmount = Math.round((perWorkerAmount - commissionAmount) * 100) / 100;

      // Locate existing pending payments for this job and transition them, or create fresh ones
      const existingPending = await prisma.payment.findMany({
        where: { jobId, farmerId, status: PaymentStatus.PENDING }
      });

      if (existingPending.length > 0) {
        for (const p of existingPending) {
          await prisma.payment.update({
            where: { id: p.id },
            data: {
              status: PaymentStatus.COMPLETED,
              paidAt: new Date(),
              upiRef: razorpay_payment_id,
              method: PaymentMethod.CARD
            }
          });

          await prisma.settlement.create({
            data: {
              workerId: p.workerId,
              paymentId: p.id,
              amount: p.workerAmount,
              status: 'pending'
            }
          });
        }
      } else {
        // Create fresh completed payment records
        for (const att of attendances) {
          const payment = await prisma.payment.create({
            data: {
              jobId,
              farmerId,
              workerId: att.workerId,
              amount: perWorkerAmount,
              commissionAmount,
              workerAmount,
              method: PaymentMethod.CARD,
              upiRef: razorpay_payment_id,
              status: PaymentStatus.COMPLETED,
              settlementStatus: 'pending',
              paidAt: new Date()
            }
          });

          await prisma.settlement.create({
            data: {
              workerId: att.workerId,
              paymentId: payment.id,
              amount: workerAmount,
              status: 'pending'
            }
          });
        }
      }
    }

    res.json({
      success: true,
      message: 'Payment verified and captured successfully'
    });
  } catch (error) {
    logger.error('Verify Razorpay Payment Error', { message: error.message });
    next(error);
  }
};

module.exports = { createOrder, verifyPayment };
