const prisma = require('../config/database'); // shared singleton — avoids connection pool exhaustion

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

    // Ownership check — a worker can only check in for themselves
    if (req.user.id !== workerId) {
      return res.status(403).json({ success: false, message: 'Cannot check in for another worker' });
    }

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
    const { attendanceId, jobId, workerId, qrCodeOut, checkOutLatitude, checkOutLongitude } = req.body;

    let targetId = attendanceId;

    if (!targetId && jobId && workerId) {
      const activeRecord = await prisma.attendance.findFirst({
        where: { jobId, workerId, checkOut: null },
        orderBy: { checkIn: 'desc' }
      });
      if (activeRecord) targetId = activeRecord.id;
    }

    if (!targetId) {
      return res.status(404).json({ success: false, message: 'Active attendance record not found' });
    }

    const attendance = await prisma.attendance.update({
      where: { id: targetId },
      data: {
        qrCodeOut,
        checkOut: new Date(),
        checkOutLatitude: parseFloat(checkOutLatitude || 0),
        checkOutLongitude: parseFloat(checkOutLongitude || 0),
      },
      include: { job: true }
    });

    // Calculate Hours
    const start = new Date(attendance.checkIn);
    const end = new Date(attendance.checkOut);
    const hours = (end - start) / (1000 * 60 * 60);

    // Update with hours — use targetId (the resolved, guaranteed ID)
    await prisma.attendance.update({
      where: { id: targetId },
      data: { hoursWorked: hours }
    });

    // Update worker status
    await prisma.user.update({
      where: { id: attendance.workerId },
      data: { status: 'available' }
    });

    // Notify Farmer via Socket
    const io = req.app.get('io');
    if (io) {
      io.to(`job:${attendance.jobId}`).emit('attendance:check_out', {
        attendanceId: attendance.id,
        workerId: attendance.workerId,
        timestamp: attendance.checkOut,
        hoursWorked: hours
      });
    }

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
