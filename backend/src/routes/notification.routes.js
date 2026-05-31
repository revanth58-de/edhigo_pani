const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth');

// GET /api/notifications - Get current user's notifications (paginated)
router.get('/', authenticate, notificationController.getNotifications);

// PATCH /api/notifications/:id/read - Mark specific notification as read
router.patch('/:id/read', authenticate, notificationController.markAsRead);

// POST /api/notifications/read-all - Mark all notifications as read
router.post('/read-all', authenticate, notificationController.markAllAsRead);

module.exports = router;
