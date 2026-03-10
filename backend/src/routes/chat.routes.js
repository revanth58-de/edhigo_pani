const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { authenticate } = require('../middleware/auth');

// GET /api/chats/:groupId/messages
router.get('/:groupId/messages', authenticate, chatController.getGroupMessages);

module.exports = router;
