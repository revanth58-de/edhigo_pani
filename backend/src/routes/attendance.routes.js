const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const { authenticate } = require('../middleware/auth');

// Worker Check-In
router.post('/check-in', authenticate, attendanceController.checkIn);

// Worker Check-Out
router.post('/check-out', authenticate, attendanceController.checkOut);

// Get attendance records for a job
router.get('/:jobId', authenticate, attendanceController.getAttendanceRecords);

module.exports = router;
