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

// Helper: Validate QR Code (JSON payload: { jobId, type, timestamp } or string: SECURE_ATTENDANCE|jobId|timestamp|lat|lon|type, or manual PIN)
const validateQR = (qrString, jobId) => {
  if (!qrString) return { valid: false, message: 'QR code data is missing' };
  try {
    if (typeof qrString === 'string' && qrString.startsWith('SECURE_ATTENDANCE|')) {
      const parts = qrString.split('|');
      const qJobId = parts[1];
      const timestamp = parts[2];
      const qType = parts[5]; // IN or OUT
      
      const qClean = (qJobId || '').trim().toLowerCase();
      const jClean = (jobId || '').trim().toLowerCase();
      if (qClean !== jClean && !jClean.endsWith(qClean) && !qClean.endsWith(jClean)) {
        return { valid: false, message: 'Invalid QR for this job' };
      }
      
      const qrTime = parseInt(timestamp);
      const now = Date.now();
      const expiry = 60 * 60 * 1000;
      if (now - qrTime > expiry) return { valid: false, message: 'QR code has expired. Please ask the farmer to refresh it.' };
      
      return { valid: true, type: qType ? qType.toLowerCase() : 'in' };
    }

    const qrData = typeof qrString === 'object' ? qrString : JSON.parse(qrString);
    const qClean = (qrData.jobId || '').trim().toLowerCase();
    const jClean = (jobId || '').trim().toLowerCase();
    if (qClean && jClean && qClean !== jClean && !jClean.endsWith(qClean) && !qClean.endsWith(jClean)) {
      return { valid: false, message: 'Invalid QR for this job' };
    }

    if (qrData.timestamp) {
      const qrTime = parseInt(qrData.timestamp);
      const now = Date.now();
      const expiry = 60 * 60 * 1000; // 60 minutes

      if (now - qrTime > expiry) return { valid: false, message: 'QR code has expired. Please ask the farmer to refresh it.' };
    }

    return { valid: true, type: qrData.type || 'in' };
  } catch (error) {
    if (typeof qrString === 'string') {
      let cleanInput = qrString.trim().toUpperCase();
      if (cleanInput.startsWith('PIN_')) {
        cleanInput = cleanInput.substring(4).trim();
      }
      const cleanJobId = (jobId || '').trim().toUpperCase();
      if (cleanJobId && (cleanJobId === cleanInput || cleanJobId.endsWith(cleanInput) || cleanInput.endsWith(cleanJobId))) {
        return { valid: true, type: 'in' };
      }
    }
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
      groupId,
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

    if (!jobId && !bookingId && (qrCodeIn || req.body.pin || req.body.jobCode)) {
      const pinVal = req.body.pin || req.body.jobCode;
      if (pinVal) {
        const pinStr = String(pinVal).trim();
        const candidateJobs = await prisma.job.findMany({
          where: {
            OR: [
              { id: pinStr },
              { id: { endsWith: pinStr } },
              { id: { endsWith: pinStr.toLowerCase() } },
            ],
          },
          take: 1,
        });
        if (candidateJobs.length > 0) {
          jobId = candidateJobs[0].id;
        } else {
          jobId = pinStr;
        }
      } else {
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

    // 5. Existing Check-In Validation & Create Record
    let workerIds = [workerId];
    if (groupId) {
      const members = await prisma.groupMember.findMany({
        where: { groupId, status: { in: ['joined', 'checked_out'] } },
        select: { workerId: true }
      });
      const memberIds = members.map(m => m.workerId);
      workerIds = Array.from(new Set([workerId, ...memberIds]));
    }

    const attendancesCreated = [];
    let mainAttendance = null;
    let existingMain = null;

    for (const wId of workerIds) {
      const existing = await prisma.attendance.findFirst({
        where: { jobId, workerId: wId, checkOut: null }
      });

      if (existing) {
        if (wId === workerId) {
          existingMain = existing;
        }
        continue;
      }

      const att = await prisma.attendance.create({
        data: {
          jobId,
          workerId: wId,
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

      await prisma.user.update({
        where: { id: wId },
        data: { status: 'working' }
      });

      if (groupId) {
        await prisma.groupMember.updateMany({
          where: { groupId, workerId: wId },
          data: { status: 'checked_in' }
        });
      }

      if (wId === workerId) {
        mainAttendance = att;
      }
      attendancesCreated.push(att);
    }

    if (attendancesCreated.length === 0 && existingMain) {
      return res.status(400).json({ success: false, message: 'Already checked in' });
    }

    const finalAttendance = mainAttendance || existingMain || attendancesCreated[0];

    // 8. Socket Notification
    const io = req.app.get('io');
    if (io && finalAttendance) {
      io.to(`job:${jobId}`).emit('attendance:check_in', {
        jobId,
        attendanceId: finalAttendance.id,
        worker: finalAttendance.worker,
        workerId: finalAttendance.workerId,
        workerName: finalAttendance.worker?.name || 'Worker',
        timestamp: finalAttendance.checkIn,
        isGroup: !!groupId,
        checkedInCount: attendancesCreated.length,
      });
    }

    // 📲 Push Notification to Farmer
    if (job?.farmer?.pushToken && finalAttendance) {
      await notifyFarmerAttendanceIn(job.farmerId, job.farmer.pushToken, finalAttendance.worker, job);
    }

    res.status(201).json({ success: true, data: finalAttendance });

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
      groupId,
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

    if (!jobId && !bookingId && (qrCodeOut || req.body.pin || req.body.jobCode)) {
      const pinVal = req.body.pin || req.body.jobCode;
      if (pinVal) {
        const pinStr = String(pinVal).trim();
        const candidateJobs = await prisma.job.findMany({
          where: {
            OR: [
              { id: pinStr },
              { id: { endsWith: pinStr } },
            ],
          },
          take: 1,
        });
        if (candidateJobs.length > 0) {
          jobId = candidateJobs[0].id;
        } else {
          jobId = pinStr;
        }
        if (!qrCodeOut) qrCodeOut = `PIN_${pinStr}`;
      } else {
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
    }

    // Validate required fields before any QR or DB checks
    if (!qrCodeOut && !req.body.pin && !req.body.jobCode) {
      return res.status(400).json({ success: false, message: 'QR code or PIN is required for check-out' });
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

      if (booking.machinery?.ownerId && booking.machinery.ownerId !== workerId) {
        return res.status(403).json({ success: false, message: 'Only the machinery owner can check out for this booking' });
      }

      const attendance = await prisma.attendance.findFirst({
        where: { bookingId, workerId, checkOut: null },
        orderBy: { checkIn: 'desc' },
      });

      if (!attendance) {
        return res.status(404).json({ success: false, message: 'No active machinery check-in found' });
      }

      const checkOutTime = new Date();
      const updatedAttendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          qrCodeOut,
          checkOut: checkOutTime,
          checkOutLatitude: parseFloat(checkOutLatitude),
          checkOutLongitude: parseFloat(checkOutLongitude),
        },
        include: {
          booking: { include: { machinery: true } },
          worker: { select: { name: true, photoUrl: true } },
        },
      });

      await prisma.machineryBooking.update({
        where: { id: bookingId },
        data: { status: 'completed' },
      });

      await prisma.user.update({
        where: { id: workerId },
        data: { status: UserStatus.AVAILABLE },
      });

      const io = req.app.get('io');
      if (io) {
        io.to(`booking:${bookingId}`).emit('attendance:check_out', {
          attendanceId: updatedAttendance.id,
          bookingId,
          worker: updatedAttendance.worker,
          workerId,
          workerName: updatedAttendance.worker?.name || 'Machinery Owner',
          timestamp: updatedAttendance.checkOut,
        });
      }

      try {
        const { createNotification, sendPush } = require('../services/pushNotification');
        const notifTitle = '🚜 Machinery Shift Completed!';
        const notifBody = `${updatedAttendance.worker.name || 'Machinery owner'} checked out with ${booking.machinery.name}.`;

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

      return res.status(200).json({ success: true, data: updatedAttendance });
    }

    if (!jobId) {
      return res.status(400).json({ success: false, message: 'Job ID is required' });
    }

    // 2. Job Validation
    const job = await prisma.job.findUnique({ 
      where: { id: jobId },
      include: { farmer: { select: { pushToken: true } } }
    });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    // 3. Geo-fence Check
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

    // Identify group checkout list
    let workerIds = [workerId];
    if (groupId) {
      const members = await prisma.groupMember.findMany({
        where: { groupId, status: 'checked_in' },
        select: { workerId: true }
      });
      const memberIds = members.map(m => m.workerId);
      workerIds = Array.from(new Set([workerId, ...memberIds]));
    }

    const checkOutTime = new Date();
    const checkedOutRecords = [];
    let mainCheckout = null;

    for (const wId of workerIds) {
      let targetId = null;
      if (wId === workerId && attendanceId) {
        targetId = attendanceId;
      } else {
        const activeRecord = await prisma.attendance.findFirst({
          where: { jobId, workerId: wId, checkOut: null },
          orderBy: { checkIn: 'desc' }
        });
        if (activeRecord) targetId = activeRecord.id;
      }

      if (!targetId) continue;

      // Update record
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
          worker: { select: { id: true, name: true, photoUrl: true } }
        }
      });

      await prisma.user.update({
        where: { id: wId },
        data: { status: UserStatus.AVAILABLE }
      });

      if (groupId) {
        await prisma.groupMember.updateMany({
          where: { groupId, workerId: wId },
          data: { status: 'checked_out' }
        });
      }

      if (wId === workerId) {
        mainCheckout = attendance;
      }
      checkedOutRecords.push(attendance);
    }

    if (checkedOutRecords.length === 0) {
      return res.status(404).json({ success: false, message: 'No active attendance found or unauthorized action' });
    }

    const finalCheckout = mainCheckout || checkedOutRecords[0];
    const hoursWorked = finalCheckout.hoursWorked || 0;

    const io = req.app.get('io');
    if (io && finalCheckout) {
      io.to(`job:${finalCheckout.jobId}`).emit('attendance:check_out', {
        jobId: finalCheckout.jobId,
        attendanceId: finalCheckout.id,
        worker: finalCheckout.worker,
        workerId: finalCheckout.workerId,
        workerName: finalCheckout.worker?.name || 'Worker',
        timestamp: finalCheckout.checkOut,
        hoursWorked,
        isGroup: !!groupId,
        checkedOutCount: checkedOutRecords.length,
      });
    }

    // 📲 Push Notification to Farmer
    if (job?.farmer?.pushToken && finalCheckout) {
      await notifyFarmerAttendanceOut(job.farmerId, job.farmer.pushToken, finalCheckout.worker, job, hoursWorked);
    }

    res.status(200).json({
      success: true,
      message: 'Checked out successfully',
      data: finalCheckout
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
