const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { makePayment, getPaymentHistory, getPaymentDetails, confirmPayment } = require('../controllers/payment.controller');
const { createOrder, verifyPayment, recordPaymentFailure } = require('../controllers/razorpay.controller');
const { handleRazorpayWebhook } = require('../controllers/webhook.controller');

// Razorpay Server-to-Server Webhook (No JWT auth — verified via x-razorpay-signature HMAC)
router.post('/razorpay/webhook', handleRazorpayWebhook);

// All other payment routes require authentication
router.post('/', authenticate, makePayment);
router.get('/history/:userId', authenticate, getPaymentHistory);

// Razorpay checkout integration
router.post('/razorpay/order', authenticate, createOrder);
router.post('/razorpay/verify', authenticate, verifyPayment);
router.post('/razorpay/failure', authenticate, recordPaymentFailure);

router.get('/:paymentId', authenticate, getPaymentDetails);
// Farmer confirms UPI payment was received (prevents pending payments forever)
router.patch('/:jobId/confirm', authenticate, confirmPayment);

module.exports = router;

