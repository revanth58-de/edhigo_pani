const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { submitRating, getUserRatings } = require('../controllers/ratings.controller');

// All rating routes require authentication
router.post('/', authenticate, submitRating);
router.post('/worker', authenticate, submitRating);  // Alias for frontend ratingService.rateWorker
router.post('/farmer', authenticate, submitRating);  // Alias for frontend ratingService.rateFarmer
router.get('/user/:userId', authenticate, getUserRatings);

module.exports = router;
