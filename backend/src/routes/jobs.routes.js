const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { createJob, getNearbyJobs } = require('../controllers/jobs.controller');

// Protected routes (require JWT)
router.post('/', authenticate, createJob);
router.get('/nearby', authenticate, getNearbyJobs);

module.exports = router;
