const crypto = require('crypto');
const prisma = require('../config/database');
const config = require('../config/env');
const { logger } = require('../middleware/errorHandler');
const { PaymentStatus, PaymentMethod } = require('../config/enums');

/**
 * POST /api/payments/razorpay/webhook
 * Handles incoming server-to-server events from Razorpay.
 */
const handleRazorpayWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const secret = config.razorpay.webhookSecret;

    // In production or when webhook secret is configured, verify HMAC signature
    const isMock = config.nodeEnv === 'test' || (config.nodeEnv === 'development' && secret.includes('placeholder'));

    if (!isMock) {
      if (!signature) {
        logger.warn('Razorpay webhook received without x-razorpay-signature header');
        return res.status(400).json({ error: 'Missing webhook signature' });
      }

      const rawPayload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawPayload)
        .digest('hex');

      const isSignatureValid = (
        signature.length === expectedSignature.length &&
        crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
      );

      if (!isSignatureValid) {
        logger.warn('Invalid Razorpay webhook signature');
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
    }

    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const event = payload?.event;
    logger.info('Razorpay webhook event received', { event });

    if (!event) {
      return res.status(400).json({ error: 'Missing event in payload' });
    }

    switch (event) {
      case 'payment.captured':
      case 'order.paid': {
        const paymentEntity = payload.payload?.payment?.entity;
        const orderEntity = payload.payload?.order?.entity;

        const paymentId = paymentEntity?.id;
        const orderId = paymentEntity?.order_id || orderEntity?.id;
        const notes = paymentEntity?.notes || orderEntity?.notes || {};
        const receipt = orderEntity?.receipt || notes?.receipt;
        const rawAmount = paymentEntity?.amount || orderEntity?.amount; // in paise
        const amountInRupees = rawAmount ? rawAmount / 100 : 0;

        const jobId = notes?.jobId || (!notes?.bookingId && receipt ? receipt : null);
        const bookingId = notes?.bookingId || (notes?.isMachinery && receipt ? receipt : null);

        logger.info('Processing webhook payment capture', { paymentId, orderId, jobId, bookingId, amountInRupees });

        if (bookingId) {
          // Process machinery booking payment if not already processed
          const booking = await prisma.machineryBooking.findUnique({
            where: { id: bookingId },
            include: { machinery: true }
          });

          if (booking) {
            let payment = await prisma.payment.findFirst({
              where: {
                OR: [
                  { upiRef: paymentId },
                  { bookingId, status: PaymentStatus.COMPLETED }
                ]
              }
            });

            if (!payment) {
              const commissionPct = 0.05;
              const commissionAmount = Math.round((amountInRupees * commissionPct) * 100) / 100;
              const workerAmount = Math.round((amountInRupees - commissionAmount) * 100) / 100;

              payment = await prisma.payment.create({
                data: {
                  bookingId,
                  farmerId: booking.farmerId,
                  workerId: booking.machinery.ownerId,
                  amount: amountInRupees || booking.totalAmount || 1000,
                  commissionAmount,
                  workerAmount,
                  method: PaymentMethod.CARD,
                  upiRef: paymentId,
                  status: PaymentStatus.COMPLETED,
                  settlementStatus: 'pending',
                  paidAt: new Date()
                }
              });

              await prisma.settlement.create({
                data: {
                  workerId: booking.machinery.ownerId,
                  paymentId: payment.id,
                  amount: workerAmount,
                  status: 'pending'
                }
              });
            }
          }
        } else if (jobId) {
          // Process job payment
          const job = await prisma.job.findUnique({ where: { id: jobId } });
          if (job) {
            const existingCompleted = await prisma.payment.findFirst({
              where: {
                OR: [
                  { upiRef: paymentId },
                  { jobId, status: PaymentStatus.COMPLETED }
                ]
              }
            });

            if (!existingCompleted) {
              let attendances = await prisma.attendance.findMany({
                where: { jobId },
                select: { workerId: true },
                distinct: ['workerId']
              });

              if (attendances.length === 0) {
                attendances = await prisma.jobApplication.findMany({
                  where: { jobId, status: 'accepted' },
                  select: { workerId: true }
                });
              }

              if (attendances.length > 0) {
                const perWorker = Math.round((amountInRupees / attendances.length) * 100) / 100;
                const commissionPct = 0.05;
                const commissionAmount = Math.round((perWorker * commissionPct) * 100) / 100;
                const workerAmount = Math.round((perWorker - commissionAmount) * 100) / 100;

                for (const att of attendances) {
                  const p = await prisma.payment.create({
                    data: {
                      jobId,
                      farmerId: job.farmerId,
                      workerId: att.workerId,
                      amount: perWorker,
                      commissionAmount,
                      workerAmount,
                      method: PaymentMethod.CARD,
                      upiRef: paymentId,
                      status: PaymentStatus.COMPLETED,
                      settlementStatus: 'pending',
                      paidAt: new Date()
                    }
                  });

                  await prisma.settlement.create({
                    data: {
                      workerId: att.workerId,
                      paymentId: p.id,
                      amount: workerAmount,
                      status: 'pending'
                    }
                  });
                }
              }
            }
          }
        }
        break;
      }

      case 'payment.failed': {
        const paymentEntity = payload.payload?.payment?.entity;
        const paymentId = paymentEntity?.id;
        const notes = paymentEntity?.notes || {};
        const errorCode = paymentEntity?.error_code;
        const errorDescription = paymentEntity?.error_description;

        logger.warn('Payment failed webhook event received', {
          paymentId,
          errorCode,
          errorDescription,
          notes
        });
        break;
      }

      default:
        logger.info(`Unhandled webhook event: ${event}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Razorpay Webhook Handler Error', { message: error.message });
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
};

module.exports = { handleRazorpayWebhook };
