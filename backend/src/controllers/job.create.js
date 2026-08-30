const prisma = require('../config/database');
const { matchWorkers } = require('../services/matchWorkers');
const { logger } = require('../middleware/errorHandler');
const { JobStatus, WorkerType, UserStatus, ApplicationStatus, GroupStatus } = require('../config/enums');
const {
  notifyWorkersNewJob,
  notifyFarmerJobAccepted,
  notifyFarmerJobWithdrawn,
  notifyWorkerJobCancelled
} = require('../services/pushNotification');

const createJob = async (req, res, next) => {
  try {
    const {
      workType,
      workerType,
      workersNeeded,
      payPerDay,
      farmLatitude,
      farmLongitude,
      latitude,
      longitude,
      farmAddress,
      description,  // FIX #14: optional free-text instructions for workers
      startTime,
      startDate,
      radiusKm, // B10: custom matching radius (in km)
      durationDays, // D5: duration of the job in days
      workerIds, // NEW: optional list of directly hired worker IDs
    } = req.body;

    // Always use the authenticated user's ID — not from body
    const farmerId = req.user?.id;
    if (!farmerId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!workType || payPerDay === undefined || !farmAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const numericPay = parseFloat(payPerDay);

    // Wage policy validation from SystemSettings
    try {
      const minWageSetting = await prisma.systemSetting.findUnique({ where: { key: 'wages.minDailyWage' } });
      const enforceSetting = await prisma.systemSetting.findUnique({ where: { key: 'wages.enforceMinimum' } });
      const minWage = minWageSetting ? parseFloat(minWageSetting.value) : 400;
      const isEnforced = enforceSetting ? enforceSetting.value === 'true' : true;

      if (isEnforced && numericPay < minWage) {
        return res.status(400).json({
          error: `Pay per day (₹${numericPay}) cannot be less than the minimum wage rate of ₹${minWage} configured for the platform.`,
          minDailyWage: minWage
        });
      }
    } catch (settingErr) {
      logger.warn('Could not verify minimum wage setting, proceeding with creation', { message: settingErr.message });
    }

    const finalLatitude = farmLatitude || latitude;
    const finalLongitude = farmLongitude || longitude;
    const finalStartTime = startTime || startDate || new Date();

    const hasWorkerIds = Array.isArray(workerIds) && workerIds.length > 0;
    const initialStatus = hasWorkerIds ? 'accepted' : JobStatus.PENDING;

    const job = await prisma.job.create({
      data: {
        farmerId,
        workType,
        workerType: workerType || 'individual',
        workersNeeded: hasWorkerIds ? workerIds.length : (parseInt(workersNeeded) || 1),
        payPerDay: numericPay,
        farmLatitude: finalLatitude ? parseFloat(finalLatitude) : null,
        farmLongitude: finalLongitude ? parseFloat(finalLongitude) : null,
        farmAddress,
        startTime: new Date(finalStartTime),
        description: description || null,
        status: initialStatus,
        radiusKm: radiusKm !== undefined && radiusKm !== null ? parseFloat(radiusKm) : null,
        durationDays: durationDays !== undefined && durationDays !== null ? parseInt(durationDays) : null,
      },
      include: {
        farmer: {
          select: { id: true, name: true, phone: true, village: true }
        }
      }
    });

    // 🔔 Real-time Admin Notification & Audit Log for Job Posting
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('admin:job_created', {
          id: job.id,
          workType: job.workType,
          workerType: job.workerType,
          workersNeeded: job.workersNeeded,
          payPerDay: job.payPerDay,
          farmAddress: job.farmAddress,
          farmer: {
            id: job.farmer?.id,
            name: job.farmer?.name || 'Farmer',
            phone: job.farmer?.phone,
            village: job.farmer?.village
          },
          createdAt: job.createdAt
        });
      }

      await prisma.auditLog.create({
        data: {
          adminId: farmerId,
          action: 'job_posted',
          targetId: job.id,
          details: {
            workType: job.workType,
            payPerDay: job.payPerDay,
            workersNeeded: job.workersNeeded,
            village: job.farmer?.village
          }
        }
      });
    } catch (adminAlertErr) {
      logger.warn('Could not record admin job alert', { message: adminAlertErr.message });
    }

    if (hasWorkerIds) {
      // Create accepted job applications for each worker
      await Promise.all(
        workerIds.map((workerId) =>
          prisma.jobApplication.create({
            data: {
              jobId: job.id,
              workerId,
              status: 'accepted',
            },
          })
        )
      );

      // Notify the workers about the direct hire
      const io = req.app.get('io');
      try {
        const hiredWorkers = await prisma.user.findMany({
          where: { id: { in: workerIds } },
          select: { id: true, pushToken: true, name: true }
        });

        if (io) {
          hiredWorkers.forEach((worker) => {
            io.to(`user:${worker.id}`).emit('job:new-offer', {
              jobId: job.id,
              workType: job.workType,
              payPerDay: job.payPerDay,
              farmAddress: job.farmAddress,
              farmLatitude: job.farmLatitude,
              farmLongitude: job.farmLongitude,
              distanceLabel: 'Directly Hired',
              workersNeeded: job.workersNeeded,
            });
          });
        }

        // 📲 Send push notifications
        await notifyWorkersNewJob(hiredWorkers, job);
      } catch (notifyErr) {
        logger.error('Direct hire notification error', { message: notifyErr.message });
      }

      return res.status(201).json({
        success: true,
        message: 'Job created and workers hired successfully',
        job,
        data: job,
      });
    }

    // ── Smart Worker Matching ─────────────────────────────────────────
    // Find available workers near the farm that have matching skills.
    // Only those workers receive the socket notification — not everyone.
    const io = req.app.get('io');
    if (io) {
      try {
        const matchedWorkers = await matchWorkers({
          farmerId,
          radiusKm: job.radiusKm,
          workType,
          workerType,
          workersNeeded,           // ← required for group size filtering
          farmLatitude: finalLatitude ? parseFloat(finalLatitude) : null,
          farmLongitude: finalLongitude ? parseFloat(finalLongitude) : null,
        });

        logger.info(`Job ${job.id}: matched ${matchedWorkers.length} workers`, { workType, workerType });

        // Emit to each matched worker's personal room (they join it on connect)
        matchedWorkers.forEach((worker) => {
          io.to(`user:${worker.id}`).emit('job:new-offer', {
            jobId: job.id,
            workType: job.workType,
            payPerDay: job.payPerDay,
            farmAddress: job.farmAddress,
            farmLatitude: job.farmLatitude,
            farmLongitude: job.farmLongitude,
            distanceKm: worker.distanceKm,
            distanceLabel: worker.distanceKm != null
              ? `${worker.distanceKm} km away`
              : 'Nearby',
            workersNeeded: job.workersNeeded,
          });
        });

        // 📲 Send push notification to matched workers (even if app is closed)
        await notifyWorkersNewJob(matchedWorkers, job);
      } catch (matchErr) {
        // Matching errors should not fail the job creation
        logger.error('Worker matching error (job still created)', { message: matchErr.message });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      job,
      data: job,
    });
  } catch (error) {
    logger.error('Create job error', { message: error.message });
    next(error);
  }
};

module.exports = { createJob };
