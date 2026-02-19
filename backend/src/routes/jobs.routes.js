const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const jobController = require('../controllers/job.controller');

// Create a new job (protected - uses authenticated user as farmerId)
router.post('/', authenticate, jobController.createJob);

// Get all jobs (with optional filters)
router.get('/', jobController.getJobs);

// Get jobs posted by the authenticated farmer
router.get('/my-jobs', authenticate, jobController.getMyJobs);

// Update job status
router.put('/:id/status', authenticate, jobController.updateJobStatus);

// Accept job
router.post('/:id/accept', authenticate, jobController.acceptJob);

module.exports = router;
