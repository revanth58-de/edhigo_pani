const express = require('express');
const router = express.Router();
const workerController = require('../controllers/worker.controller');
const { getEarnings, downloadEarningsPdf } = require('../controllers/earnings.controller');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/workers/nearby - Fetch nearby workers to add to a group
router.get('/nearby', authenticate, requireRole('leader', 'farmer'), workerController.getNearbyWorkers);

// F1: GET /api/workers/earnings - Worker earnings dashboard data
router.get('/earnings', authenticate, getEarnings);

// F5: GET /api/workers/earnings/pdf - Download PDF Earnings & Work Certificate
router.get('/earnings/pdf', authenticate, downloadEarningsPdf);

module.exports = router;
