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

// Create a new job
const createJob = async (req, res, next) => {
  try {
    const {
      workType,
      workerType,
      workersNeeded,
      payPerDay,
      farmLatitude,
      farmLongitude,
      farmAddress,
      description,  // FIX #14: optional free-text instructions for workers
    } = req.body;

    // Always use the authenticated user's ID — not from body
    const farmerId = req.user?.id;
    if (!farmerId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const job = await prisma.job.create({
      data: {
        farmerId,
        workType,
        workerType: workerType || 'individual',
        workersNeeded: parseInt(workersNeeded) || 1,
        payPerDay: parseFloat(payPerDay),
        farmLatitude: farmLatitude ? parseFloat(farmLatitude) : null,
        farmLongitude: farmLongitude ? parseFloat(farmLongitude) : null,
        farmAddress,
        description: description || null,
        status: JobStatus.PENDING,
      },
    });

    // ── Smart Worker Matching ─────────────────────────────────────────
    // Find available workers near the farm that have matching skills.
    // Only those workers receive the socket notification — not everyone.
    const io = req.app.get('io');
    if (io) {
      try {
        const matchedWorkers = await matchWorkers({
          workType,
          workerType,
          workersNeeded,           // ← required for group size filtering
          farmLatitude: farmLatitude ? parseFloat(farmLatitude) : null,
          farmLongitude: farmLongitude ? parseFloat(farmLongitude) : null,
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
      data: job,
    });
  } catch (error) {
    logger.error('Create job error', { message: error.message });
    next(error);
  }
};

module.exports = { createJob };
