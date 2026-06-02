const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { createDispute, getMyDisputes, getJobDisputes } = require('../controllers/dispute.controller');

// All dispute routes require user authentication
router.post('/', authenticate, createDispute);
router.get('/my', authenticate, getMyDisputes);
router.get('/job/:jobId', authenticate, getJobDisputes);

module.exports = router;
