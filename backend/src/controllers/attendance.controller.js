const prisma = require('../config/database');
const { notifyFarmerAttendanceIn, notifyFarmerAttendanceOut } = require('../services/pushNotification');
const { logger } = require('../middleware/errorHandler');
const { UserStatus } = require('../config/enums'); // D1

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

// Helper: Validate QR Code (JSON payload: { jobId, type, timestamp } or string: SECURE_ATTENDANCE|jobId|timestamp|lat|lon|type)
const validateQR = (qrString, jobId) => {
  try {
    if (typeof qrString === 'string' && qrString.startsWith('SECURE_ATTENDANCE|')) {
      const parts = qrString.split('|');
      const qJobId = parts[1];
      const timestamp = parts[2];
      const qType = parts[5]; // IN or OUT
      
      if (qJobId !== jobId) return { valid: false, message: 'Invalid QR for this job' };
      
      const qrTime = parseInt(timestamp);
      const now = Date.now();
      const expiry = 30 * 60 * 1000;
      if (now - qrTime > expiry) return { valid: false, message: 'QR code has expired. Please ask the farmer to refresh it.' };
      
      return { valid: true, type: qType ? qType.toLowerCase() : 'in' };
    }

    const qrData = JSON.parse(qrString);
    if (qrData.jobId !== jobId) return { valid: false, message: 'Invalid QR for this job' };

    const qrTime = parseInt(qrData.timestamp);
    const now = Date.now();
    const expiry = 30 * 60 * 1000; // 30 minutes

    if (now - qrTime > expiry) return { valid: false, message: 'QR code has expired. Please ask the farmer to refresh it.' };

    return { valid: true, type: qrData.type };
  } catch (error) {
    return { valid: false, message: 'Invalid QR format.' };
  }
};

// Worker Check-In
const checkIn = async (req, res, next) => {
  try {
    let {
      jobId,
      bookingId,
      workerId,
      qrCodeIn, // Format: jobId|timestamp or {"bookingId": "..."}
      checkInLatitude,
      checkInLongitude,
      qrData,
      latitude,
      longitude,
    } = req.body;

    if (!qrCodeIn && qrData) qrCodeIn = qrData;
    if (checkInLatitude == null && latitude != null) checkInLatitude = latitude;
    if (checkInLongitude == null && longitude != null) checkInLongitude = longitude;
    if (!workerId && req.user?.id) workerId = req.user.id;

    if (!jobId && !bookingId && qrCodeIn) {
      try {
        if (typeof qrCodeIn === 'string' && qrCodeIn.startsWith('SECURE_ATTENDANCE|')) {
          jobId = qrCodeIn.split('|')[1];
        } else {
          const parsed = JSON.parse(qrCodeIn);
          if (parsed.jobId) jobId = parsed.jobId;
          if (parsed.bookingId) bookingId = parsed.bookingId;
        }
      } catch (_) {}
    }

    // 1. Basic Validation
    if (req.user?.id !== workerId) {
      return res.status(403).json({ success: false, message: 'Cannot check in for another worker/owner' });
    }

    // Machinery Booking Check-In Flow
    if (bookingId) {
      const booking = await prisma.machineryBooking.findUnique({
        where: { id: bookingId },
        include: {
          farmer: { select: { pushToken: true, name: true } },
          machinery: { include: { owner: { select: { name: true } } } },
        },
      });

      if (!booking) {
        return res.status(404).json({ success: false, message: 'Machinery booking not found' });
      }

      if (booking.machinery.ownerId !== workerId) {
        return res.status(403).json({ success: false, message: 'Only the machinery owner can check in for this booking' });
      }

      if (booking.status !== 'confirmed') {
        return res.status(400).json({ success: false, message: 'Machinery booking must be confirmed to check in' });
      }

      // Geofence check
      const { geofenceEnabled } = require('../config/env');
      if (geofenceEnabled && booking.latitude != null && booking.longitude != null) {
        const distance = getDistance(
          parseFloat(checkInLatitude),
          parseFloat(checkInLongitude),
          parseFloat(booking.latitude),
          parseFloat(booking.longitude)
        );
        if (distance > 100) {
          return res.status(400).json({
            success: false,
            message: `Too far from farm. You are ${Math.round(distance)}m away. Limit is 100m.`,
          });
        }
      }

      const existing = await prisma.attendance.findFirst({
        where: { bookingId, workerId, checkOut: null }
      });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Already checked in' });
      }

      const attendance = await prisma.attendance.create({
        data: {
          bookingId,
          workerId,
          qrCodeIn,
          checkIn: new Date(),
          checkInLatitude: parseFloat(checkInLatitude),
          checkInLongitude: parseFloat(checkInLongitude),
        },
        include: {
          booking: { include: { machinery: true } },
          worker: { select: { name: true, photoUrl: true } }
        }
      });

      await prisma.machineryBooking.update({
        where: { id: bookingId },
        data: { status: 'in_progress' }
      });

      await prisma.user.update({
        where: { id: workerId },
        data: { status: 'working' }
      });

      // Socket Notification
      const io = req.app.get('io');
      if (io) {
        io.to(`booking:${bookingId}`).emit('attendance:check_in', {
          attendanceId: attendance.id,
          bookingId,
          worker: attendance.worker,
          timestamp: attendance.checkIn
        });
      }

      try {
        const { createNotification, sendPush } = require('../services/pushNotification');
        const notifTitle = '🚜 Machinery Checked-In!';
        const notifBody = `${attendance.worker.name || 'Machinery owner'} checked in with ${booking.machinery.name} for your booking.`;

        await createNotification(booking.farmerId, notifTitle, notifBody, {
          bookingId,
          screen: 'FarmerHistory',
        });

        if (booking.farmer?.pushToken) {
          await sendPush(booking.farmer.pushToken, notifTitle, notifBody, {
            bookingId,
            screen: 'FarmerHistory',
          });
        }
      } catch (notifError) {
        logger.error('Failed to notify farmer of machinery check-in', { message: notifError.message });
      }

      return res.status(201).json({ success: true, data: attendance });
    }

    if (!jobId) {
      return res.status(400).json({ success: false, message: 'Job ID is required' });
    }

    // 2. Job & Location Validation
    const job = await prisma.job.findUnique({ 
      where: { id: jobId },
      include: { farmer: { select: { pushToken: true } } }
    });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    // 3. Geo-fence Check (100m) — controlled by GEOFENCE_ENABLED env flag
    const { geofenceEnabled } = require('../config/env');

    const distance = getDistance(
      parseFloat(checkInLatitude),
      parseFloat(checkInLongitude),
      parseFloat(job.farmLatitude),
      parseFloat(job.farmLongitude)
    );

    if (geofenceEnabled) {
      if (job.farmLatitude == null || job.farmLongitude == null) {
        return res.status(400).json({
          success: false,
          message: 'This job has no farm location set. Check-in not possible without a farm location.'
        });
      }
      if (distance > 100) {
        return res.status(400).json({
          success: false,
          message: `Too far from farm. You are ${Math.round(distance)}m away. Limit is 100m.`
        });
      }
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

    // 📲 Push Notification to Farmer
    if (job?.farmer?.pushToken) {
      await notifyFarmerAttendanceIn(job.farmerId, job.farmer.pushToken, attendance.worker, job);
    }

    res.status(201).json({ success: true, data: attendance });

  } catch (error) {
    logger.error('Check-in error', { message: error.message });
    res.status(500).json({ success: false, message: 'Check-in failed' });
  }
};

// Worker Check-Out
const checkOut = async (req, res, next) => {
  try {
    let {
      attendanceId,
      jobId,
      bookingId,
      workerId,
      qrCodeOut,
      checkOutLatitude,
      checkOutLongitude,
      qrData,
      latitude,
      longitude,
    } = req.body;

    if (!qrCodeOut && qrData) qrCodeOut = qrData;
    if (checkOutLatitude == null && latitude != null) checkOutLatitude = latitude;
    if (checkOutLongitude == null && longitude != null) checkOutLongitude = longitude;
    if (!workerId && req.user?.id) workerId = req.user.id;

    if (!jobId && !bookingId && qrCodeOut) {
      try {
        if (typeof qrCodeOut === 'string' && qrCodeOut.startsWith('SECURE_ATTENDANCE|')) {
          jobId = qrCodeOut.split('|')[1];
        } else {
          const parsed = JSON.parse(qrCodeOut);
          if (parsed.jobId) jobId = parsed.jobId;
          if (parsed.bookingId) bookingId = parsed.bookingId;
        }
      } catch (_) {}
    }

    // Validate required fields before any QR or DB checks
    if (!qrCodeOut) {
      return res.status(400).json({ success: false, message: 'QR code is required for check-out' });
    }
    if (checkOutLatitude == null || checkOutLongitude == null) {
      return res.status(400).json({ success: false, message: 'Location is required for check-out' });
    }

    // Machinery Booking Check-Out Flow
    if (bookingId) {
      let targetId = attendanceId;
      if (!targetId && bookingId && workerId) {
        const activeRecord = await prisma.attendance.findFirst({
          where: { bookingId, workerId, checkOut: null },
          orderBy: { checkIn: 'desc' }
        });
        if (activeRecord) targetId = activeRecord.id;
      }

      if (!targetId) {
        return res.status(404).json({ success: false, message: 'No active attendance found or unauthorized action' });
      }

      const record = await prisma.attendance.findUnique({ where: { id: targetId }, select: { workerId: true } });
      if (record && record.workerId !== req.user.id) {
         return res.status(403).json({ success: false, message: 'Cannot check out for another worker/owner' });
      }

      const booking = await prisma.machineryBooking.findUnique({
        where: { id: bookingId },
        include: {
          farmer: { select: { pushToken: true } },
          machinery: true
        }
      });
      if (!booking) return res.status(404).json({ success: false, message: 'Machinery booking not found' });

      // Geofence Check
      const { geofenceEnabled } = require('../config/env');
      if (geofenceEnabled && booking.latitude != null && booking.longitude != null) {
        const distance = getDistance(
          parseFloat(checkOutLatitude),
          parseFloat(checkOutLongitude),
          parseFloat(booking.latitude),
          parseFloat(booking.longitude)
        );
        if (distance > 100) {
          return res.status(400).json({
            success: false,
            message: `Too far from farm to check out. You are ${Math.round(distance)}m away.`
          });
        }
      }

      const existing = await prisma.attendance.findUnique({ where: { id: targetId }, select: { checkIn: true } });
      if (!existing) return res.status(404).json({ success: false, message: 'Attendance record not found' });

      const checkOutTime = new Date();

      const attendance = await prisma.attendance.update({
        where: { id: targetId },
        data: {
          qrCodeOut,
          checkOut: checkOutTime,
          checkOutLatitude: parseFloat(checkOutLatitude),
          checkOutLongitude: parseFloat(checkOutLongitude),
        },
        include: {
          booking: { include: { machinery: true } },
          worker: { select: { name: true } }
        }
      });

      const hoursWorked = attendance.hoursWorked || 0;

      await prisma.machineryBooking.update({
        where: { id: bookingId },
        data: { status: 'completed' }
      });

      await prisma.user.update({
        where: { id: attendance.workerId },
        data: { status: 'available' }
      });

      // Socket Notification
      const io = req.app.get('io');
      if (io) {
        io.to(`booking:${bookingId}`).emit('attendance:check_out', {
          attendanceId: attendance.id,
          bookingId,
          worker: attendance.worker,
          timestamp: attendance.checkOut
        });
      }

      try {
        const { createNotification, sendPush } = require('../services/pushNotification');
        const notifTitle = '🚜 Machinery Checked-Out!';
        const notifBody = `${attendance.worker.name || 'Machinery owner'} checked out with ${booking.machinery.name} after ${hoursWorked.toFixed(1)} hours. Please complete the payment.`;

        await createNotification(booking.farmerId, notifTitle, notifBody, {
          bookingId,
          screen: 'FarmerHistory',
        });

        if (booking.farmer?.pushToken) {
          await sendPush(booking.farmer.pushToken, notifTitle, notifBody, {
            bookingId,
            screen: 'FarmerHistory',
          });
        }
      } catch (notifError) {
        logger.error('Failed to notify farmer of machinery check-out', { message: notifError.message });
      }

      return res.status(200).json({
        success: true,
        message: 'Checked out successfully',
        data: attendance
      });
    }

    if (!jobId) {
      return res.status(400).json({ success: false, message: 'Job ID is required for check-out' });
    }

    let targetId = attendanceId;
    if (!targetId && jobId && workerId) {
      const activeRecord = await prisma.attendance.findFirst({
        where: { jobId, workerId, checkOut: null },
        orderBy: { checkIn: 'desc' }
      });
      if (activeRecord) targetId = activeRecord.id;
    }

    if (!targetId) {
      return res.status(404).json({ success: false, message: 'No active attendance found or unauthorized action' });
    }

    // Authorization: SEC-5 FIX — only trust req.user.id from JWT, never fallback to request body
    const record = await prisma.attendance.findUnique({ where: { id: targetId }, select: { workerId: true } });
    if (record && record.workerId !== req.user.id) {
       return res.status(403).json({ success: false, message: 'Cannot check out for another worker' });
    }

    // 1. QR Validation
    const qrResult = validateQR(qrCodeOut, jobId);
    if (!qrResult.valid) {
      return res.status(400).json({ success: false, message: qrResult.message });
    }

    // 2. Geo-fence Check
    const job = await prisma.job.findUnique({ 
      where: { id: jobId },
      include: { farmer: { select: { pushToken: true } } }
    });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    const { geofenceEnabled } = require('../config/env');

    const distance = getDistance(
      parseFloat(checkOutLatitude),
      parseFloat(checkOutLongitude),
      parseFloat(job.farmLatitude),
      parseFloat(job.farmLongitude)
    );

    if (geofenceEnabled && distance > 100) {
      return res.status(400).json({
        success: false,
        message: `Too far from farm to check out. You are ${Math.round(distance)}m away.`
      });
    }

    // 3. Fetch check-in record to confirm existence
    const existing = await prisma.attendance.findUnique({ where: { id: targetId }, select: { checkIn: true } });
    if (!existing) return res.status(404).json({ success: false, message: 'Attendance record not found' });

    const checkOutTime = new Date();

    // 4. Single update with all fields (hoursWorked is computed by DB BEFORE UPDATE trigger)
    const attendance = await prisma.attendance.update({
      where: { id: targetId },
      data: {
        qrCodeOut,
        checkOut: checkOutTime,
        checkOutLatitude: parseFloat(checkOutLatitude),
        checkOutLongitude: parseFloat(checkOutLongitude),
      },
      include: { 
        job: true,
        worker: { select: { name: true } }
      }
    });

    const hoursWorked = attendance.hoursWorked;

    await prisma.user.update({
      where: { id: attendance.workerId },
      data: { status: UserStatus.AVAILABLE }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`job:${attendance.jobId}`).emit('attendance:check_out', {
        jobId: attendance.jobId,
        attendanceId: attendance.id,
        workerId: attendance.workerId,
        timestamp: attendance.checkOut,
        hoursWorked
      });
    }

    // 📲 Push Notification to Farmer
    if (job?.farmer?.pushToken) {
      await notifyFarmerAttendanceOut(job.farmerId, job.farmer.pushToken, attendance.worker, job, hoursWorked);
    }

    res.status(200).json({
      success: true,
      message: 'Checked out successfully',
      data: attendance
    });

  } catch (error) {
    logger.error('Check-out error', { message: error.message });
    res.status(500).json({ success: false, message: 'Check-out failed' });
  }
};

const getAttendanceRecords = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    // 1. Fetch job to check ownership
    const job = await prisma.job.findUnique({ where: { id: jobId }, select: { farmerId: true } });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    // 2. Check if user is the farmer or a participating worker
    const isFarmer = job.farmerId === userId;
    const participationCount = await prisma.attendance.count({
      where: { jobId, workerId: userId }
    });

    if (!isFarmer && participationCount === 0) {
      return res.status(403).json({ success: false, message: 'Not authorized to view these attendance records' });
    }

    const records = await prisma.attendance.findMany({
      where: { jobId },
      include: {
        worker: { select: { id: true, name: true, phone: true, photoUrl: true } }
      },
      orderBy: { checkIn: 'desc' },
    });
    res.json({ success: true, data: records, count: records.length });
  } catch (error) {
    logger.error('Get attendance records error', { message: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch attendance' });
  }
};

module.exports = { checkIn, checkOut, getAttendanceRecords };
