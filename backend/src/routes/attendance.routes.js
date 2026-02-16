const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');

// Worker Check-In
router.post('/check-in', attendanceController.checkIn);

// Worker Check-Out
router.post('/check-out', attendanceController.checkOut);

// Get attendance records for a job
router.get('/:jobId', attendanceController.getAttendanceRecords);

module.exports = router;
