const prisma = require('../config/database');

// Helper: Calculate distance in meters between two points
const getDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Helper: Validate QR Code (Format: jobId|timestamp)
const validateQR = (qrString, jobId) => {
  try {
    const [qrJobId, timestamp] = qrString.split('|');
    if (qrJobId !== jobId) return { valid: false, message: 'Invalid QR for this job' };

    const qrTime = parseInt(timestamp);
    const now = Date.now();
    const expiry = 35000; // 35 seconds (30s specified + 5s buffer for network)

    if (now - qrTime > expiry) return { valid: false, message: 'QR code has expired' };

    return { valid: true };
  } catch (error) {
    return { valid: false, message: 'Invalid QR format' };
  }
};

// Worker Check-In
const checkIn = async (req, res) => {
  try {
    const {
      jobId,
      workerId,
      qrCodeIn, // Format: jobId|timestamp
      checkInLatitude,
      checkInLongitude
    } = req.body;

    // 1. Basic Validation
    if (req.user.id !== workerId) {
      return res.status(403).json({ success: false, message: 'Cannot check in for another worker' });
    }

    // 2. Job & Location Validation
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    // 3. Geo-fence Check (100m)
    const distance = getDistance(
      parseFloat(checkInLatitude),
      parseFloat(checkInLongitude),
      parseFloat(job.farmLatitude),
      parseFloat(job.farmLongitude)
    );

    if (distance > 100) {
      return res.status(400).json({
        success: false,
        message: `Too far from farm. You are ${Math.round(distance)}m away. Limit is 100m.`
      });
    }

    // 4. QR Validation (30s expiry)
    const qrResult = validateQR(qrCodeIn, jobId);
    if (!qrResult.valid) {
      return res.status(400).json({ success: false, message: qrResult.message });
    }

    // 5. Existing Check-In Validation
    const existing = await prisma.attendance.findFirst({
      where: { jobId, workerId, checkOut: null }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Already checked in' });
    }

    // 6. Create Record
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
        worker: { select: { name: true, photoUrl: true } }
      }
    });

    // 7. Update Status
    await prisma.user.update({
      where: { id: workerId },
      data: { status: 'working' }
    });

    // 8. Socket Notification
    const io = req.app.get('io');
    if (io) {
      io.to(`job:${jobId}`).emit('attendance:check_in', {
        attendanceId: attendance.id,
        worker: attendance.worker,
        timestamp: attendance.checkIn
      });
    }

    res.status(201).json({ success: true, data: attendance });

  } catch (error) {
    console.error('Check-In Error:', error);
    res.status(500).json({ success: false, message: 'Check-in failed', error: error.message });
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
      return res.status(404).json({ success: false, message: 'No active attendance found' });
    }

    // 1. QR Validation
    const qrResult = validateQR(qrCodeOut, jobId);
    if (!qrResult.valid) {
      return res.status(400).json({ success: false, message: qrResult.message });
    }

    // 2. Geo-fence Check
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    const distance = getDistance(
      parseFloat(checkOutLatitude),
      parseFloat(checkOutLongitude),
      parseFloat(job.farmLatitude),
      parseFloat(job.farmLongitude)
    );

    if (distance > 100) {
      return res.status(400).json({
        success: false,
        message: `Too far from farm to check out. You are ${Math.round(distance)}m away.`
      });
    }

    // 3. Update Record
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

    const start = new Date(attendance.checkIn);
    const end = new Date(attendance.checkOut);
    const hours = (end - start) / (1000 * 60 * 60);

    await prisma.attendance.update({
      where: { id: targetId },
      data: { hoursWorked: hours }
    });

    await prisma.user.update({
      where: { id: attendance.workerId },
      data: { status: 'available' }
    });

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
    res.status(500).json({ success: false, message: 'Check-out failed', error: error.message });
  }
};

const getAttendanceRecords = async (req, res) => {
  try {
    const { jobId } = req.params;
    const records = await prisma.attendance.findMany({
      where: { jobId },
      include: {
        worker: { select: { id: true, name: true, phone: true, photoUrl: true } }
      },
      orderBy: { checkIn: 'desc' },
    });
    res.json({ success: true, data: records, count: records.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch attendance', error: error.message });
  }
};

module.exports = { checkIn, checkOut, getAttendanceRecords };
