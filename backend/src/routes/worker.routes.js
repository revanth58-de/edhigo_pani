const express = require('express');
const router = express.Router();
const workerController = require('../controllers/worker.controller');
const { authenticate } = require('../middleware/auth');

// GET /api/workers/nearby - Fetch nearby workers to add to a group
router.get('/nearby', authenticate, workerController.getNearbyWorkers);

module.exports = router;
