const express = require('express');
const router = express.Router();
const workerController = require('../controllers/worker.controller');
const { getEarnings } = require('../controllers/earnings.controller');
const { authenticate } = require('../middleware/auth');

// GET /api/workers/nearby - Fetch nearby workers to add to a group
router.get('/nearby', authenticate, workerController.getNearbyWorkers);

// F1: GET /api/workers/earnings - Worker earnings dashboard data
router.get('/earnings', authenticate, getEarnings);

module.exports = router;
