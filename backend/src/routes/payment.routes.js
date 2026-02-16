const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { makePayment, getPaymentHistory, getPaymentDetails } = require('../controllers/payment.controller');

// All payment routes require authentication
router.post('/', authenticate, makePayment);
router.get('/history/:userId', authenticate, getPaymentHistory);
router.get('/:paymentId', authenticate, getPaymentDetails);

module.exports = router;
