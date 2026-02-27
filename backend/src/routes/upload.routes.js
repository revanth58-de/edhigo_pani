const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload.middleware');
const uploadController = require('../controllers/upload.controller');
const { authenticate } = require('../middleware/auth');

router.post('/profile-picture', authenticate, upload.single('image'), uploadController.uploadProfilePicture);

module.exports = router;
