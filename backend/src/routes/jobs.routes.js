const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const jobController = require('../controllers/job.controller');

// Create a new job (protected - uses authenticated user as farmerId)
router.post('/', authenticate, jobController.createJob);

// Get all jobs (with optional filters)
router.get('/', jobController.getJobs);

// Get jobs posted by the authenticated farmer (must be before /:id)
router.get('/my-jobs', authenticate, jobController.getMyJobs);

// Get nearby workers
router.get('/nearby-workers', authenticate, jobController.getNearbyWorkers);

// Get a single job by ID
router.get('/:id', authenticate, jobController.getJobById);

// Update job status
router.put('/:id/status', authenticate, jobController.updateJobStatus);

// Accept job (atomic — race condition safe)
router.post('/:id/accept', authenticate, jobController.acceptJob);

// Withdraw from an accepted job (Radio System — revert + re-notify)
router.post('/:id/withdraw', authenticate, jobController.withdrawJob);

// Cancel/delete a job
router.delete('/:id', authenticate, jobController.cancelJob);

module.exports = router;
