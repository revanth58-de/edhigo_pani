const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const jobController = require('../controllers/job.controller');

// Create a new job (farmer only)
router.post('/', authenticate, requireRole('farmer'), jobController.createJob);

// Get all jobs (with optional filters) — authenticated so workerId filter is secure
router.get('/', authenticate, jobController.getJobs);

// Get jobs posted by the authenticated farmer (must be before /:id)
router.get('/my-jobs', authenticate, jobController.getMyJobs);

// Get jobs the authenticated worker has attended (history) — cleaner than workerId filter
router.get('/worker-history', authenticate, jobController.getWorkerHistory);

// Get nearby workers
router.get('/nearby-workers', authenticate, jobController.getNearbyWorkers);

// Get a single job by ID
router.get('/:id', authenticate, jobController.getJobById);

// Update job status
router.put('/:id/status', authenticate, jobController.updateJobStatus);

// Accept job (atomic — race condition safe) — workers and leaders only
router.post('/:id/accept', authenticate, requireRole('worker', 'leader'), jobController.acceptJob);

// Withdraw from an accepted job (Radio System — revert + re-notify)
router.post('/:id/withdraw', authenticate, jobController.withdrawJob);

// Cancel/delete a job — farmer only
router.delete('/:id', authenticate, requireRole('farmer'), jobController.cancelJob);

module.exports = router;
