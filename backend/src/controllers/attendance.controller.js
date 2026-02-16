const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Worker Check-In
const checkIn = async (req, res) => {
  try {
    const {
      jobId,
      workerId,
      qrCodeIn, // Scanned QR content
      checkInLatitude,
      checkInLongitude
    } = req.body;

    // Validate if worker is already checked in for this job
    const existing = await prisma.attendance.findFirst({
      where: {
        jobId,
        workerId,
        checkOut: null
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Worker already checked in'
      });
    }

    // Create attendance record
    const attendance = await prisma.attendance.create({
      data: {
        jobId,
        workerId,
        qrCodeIn,
        checkIn: new Date(),
        checkInLatitude: parseFloat(checkInLatitude),
        checkInLongitude: parseFloat(checkInLongitude),
      },
      include: {
        job: true,
        worker: {
          select: { name: true, photoUrl: true }
        }
      }
    });

    // Update worker status
    await prisma.user.update({
      where: { id: workerId },
      data: { status: 'working' }
    });

    // Notify Farmer via Socket
    const io = req.app.get('io');
    if (io) {
      io.to(`job:${jobId}`).emit('attendance:check_in', {
        attendanceId: attendance.id,
        worker: attendance.worker,
        timestamp: attendance.checkIn
      });
    }

    res.status(201).json({
      success: true,
      data: attendance
    });

  } catch (error) {
    console.error('Check-In Error:', error);
    res.status(500).json({
      success: false,
      message: 'Check-in failed',
      error: error.message
    });
  }
};

// Worker Check-Out
const checkOut = async (req, res) => {
  try {
    const { attendanceId, qrCodeOut, checkOutLatitude, checkOutLongitude } = req.body;

    const attendance = await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        qrCodeOut,
        checkOut: new Date(),
        checkOutLatitude: parseFloat(checkOutLatitude),
        checkOutLongitude: parseFloat(checkOutLongitude),
      },
      include: { job: true }
    });

    // Calculate Hours
    const start = new Date(attendance.checkIn);
    const end = new Date(attendance.checkOut);
    const hours = (end - start) / (1000 * 60 * 60);

    // Update with hours
    await prisma.attendance.update({
        where: { id: attendanceId },
        data: { hoursWorked: hours }
    });

    // Update worker status
    await prisma.user.update({
      where: { id: attendance.workerId },
      data: { status: 'available' }
    });

    res.status(200).json({
      success: true,
      message: 'Checked out successfully',
      data: { ...attendance, hoursWorked: hours }
    });

  } catch (error) {
    console.error('Check-Out Error:', error);
    res.status(500).json({
      success: false,
      message: 'Check-out failed',
      error: error.message
    });
  }
};

// Get Attendance Records for a Job
const getAttendanceRecords = async (req, res) => {
  try {
    const { jobId } = req.params;

    const records = await prisma.attendance.findMany({
      where: { jobId },
      include: {
        worker: {
          select: { id: true, name: true, phone: true, photoUrl: true },
        },
      },
      orderBy: { checkIn: 'desc' },
    });

    res.json({
      success: true,
      data: records,
      count: records.length,
    });
  } catch (error) {
    console.error('Get Attendance Records Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance records',
      error: error.message,
    });
  }
};

module.exports = {
  checkIn,
  checkOut,
  getAttendanceRecords,
};
