const express = require('express');
const router = express.Router();
const jobController = require('../controllers/job.controller');

// Create a new job
router.post('/', jobController.createJob);

// Get all jobs
router.get('/', jobController.getJobs);

// Update job status
router.put('/:id/status', jobController.updateJobStatus);

// Accept job
router.post('/:id/accept', jobController.acceptJob);

module.exports = router;
