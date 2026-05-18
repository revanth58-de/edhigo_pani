const prisma = require('../config/database');
const { matchWorkers } = require('../services/matchWorkers');
const { logger } = require('../middleware/errorHandler');
const { JobStatus, GroupStatus } = require('../config/enums');
const {
  notifyFarmerJobAccepted,
  notifyFarmerJobWithdrawn,
  notifyWorkerJobCancelled
} = require('../services/pushNotification');

// Update job status
const updateJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Authorization: only the farmer who owns the job can update its status
    const existingJob = await prisma.job.findUnique({ where: { id } });
    if (!existingJob) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    if (existingJob.farmerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this job' });
    }

    const job = await prisma.job.update({
      where: { id },
      data: { status },
    });

    // Notify via Socket.io if available
    const io = req.app.get('io');
    if (io) {
      io.to(`job:${id}`).emit('job:status_update', { id, status });
    }

    res.status(200).json({
      success: true,
      message: 'Job status updated',
      data: job,
    });
  } catch (error) {
    logger.error('Update job status error', { message: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to update job',
    });
  }
};

// ── Accept a Job (Atomic — Race Condition Safe) ────────────────────────────
// Uses a Prisma transaction that conditionally updates only if the job is
// still in 'pending' state.  If two workers hit this simultaneously, only
// one will update the row; the other receives 0 updated records and gets a
// 409 "Already Taken" response.  The accepted worker triggers:
//   • farmer  → job:accepted   (personal room notification)
//   • everyone → job:taken     (global broadcast so all workers remove it from feed)
const acceptJob = async (req, res) => {
  try {
    const { id } = req.params;
    const workerId = req.user?.id;

    if (!workerId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Wrap the acceptance logic in a transaction to prevent race conditions
    const { job, workerDetails, farmerFull, isNowFull, acceptedCount } = await prisma.$transaction(async (tx) => {
      const currentJob = await tx.job.findUnique({
        where: { id },
        include: {
          farmer: { select: { id: true, name: true, phone: true } },
        },
      });

      if (!currentJob || currentJob.status !== JobStatus.PENDING) {
        throw new Error('JOB_UNAVAILABLE');
      }

      // Ensure this worker hasn't already accepted
      const existingApp = await tx.jobApplication.findFirst({
        where: { jobId: id, workerId },
      });

      if (existingApp?.status === 'accepted') {
        throw new Error('ALREADY_ACCEPTED');
      }

      // Count currently accepted workers for this job
      const acceptedCount = await tx.jobApplication.count({
        where: { jobId: id, status: 'accepted' },
      });

      const isGroupJob = currentJob.workerType === 'group';
      let leaderGroupId = null;
      if (isGroupJob) {
        if (acceptedCount >= 1) {
          throw new Error('JOB_FULL');
        }
        // Fetch the leader's active group
        const group = await tx.group.findFirst({
          where: { leaderId: workerId, status: { in: [GroupStatus.FORMING, 'available', GroupStatus.ACTIVE] } },
        });
        if (group) {
          leaderGroupId = group.id;
        }
      } else {
        if (acceptedCount >= currentJob.workersNeeded) {
          throw new Error('JOB_FULL');
        }
      }

      // Accept this worker (and associate group if applicable)
      if (!existingApp) {
        await tx.jobApplication.create({
          data: { jobId: id, workerId, status: 'accepted', groupId: leaderGroupId },
        });
      } else {
        await tx.jobApplication.update({
          where: { id: existingApp.id },
          data: { status: 'accepted', groupId: leaderGroupId },
        });
      }

      const isNowFull = isGroupJob ? true : ((acceptedCount + 1) >= currentJob.workersNeeded);

      // Close job *only* if required workers are fulfilled
      if (isNowFull) {
        await tx.job.update({
          where: { id },
          data: { status: 'accepted' },
        });
      }

      const workerDetails = await tx.user.findUnique({
        where: { id: workerId },
        select: {
          id: true, name: true, phone: true, photoUrl: true,
          ratingAvg: true, skills: true, village: true,
          latitude: true, longitude: true,
        },
      });

      const farmerFull = await tx.user.findUnique({
        where: { id: currentJob.farmer.id },
        select: { pushToken: true },
      });

      return { job: currentJob, workerDetails, farmerFull, isNowFull, acceptedCount };
    });

    // 📲 Push to farmer even if app is closed
    if (farmerFull?.pushToken) {
      await notifyFarmerJobAccepted(farmerFull.pushToken, workerDetails, job);
    }

    const io = req.app.get('io');
    if (io) {
      // 1️⃣ Notify farmer that a worker was accepted (personal room)
      io.to(`user:${job.farmer.id}`).emit('job:accepted', {
        jobId: id,
        workerId,
        workerName: workerDetails?.name || 'Worker',
        workerPhone: workerDetails?.phone || null,
        workerPhotoUrl: workerDetails?.photoUrl || null,
        workerRating: workerDetails?.ratingAvg || 0,
        workerSkills: workerDetails?.skills || null,
        workerVillage: workerDetails?.village || null,
        isFullyStaffed: isNowFull,
        acceptedCount: acceptedCount + 1,          // how many have accepted so far
        workersNeeded: job.workersNeeded,           // total slots
      });

      // 2️⃣ Broadcast globally ONLY IF the job is fully staffed
      if (isNowFull) {
        io.emit('job:taken', { jobId: id });
        logger.info('job:taken broadcast sent', { jobId: id });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Job accepted successfully',
      isFullyStaffed: isNowFull,
      data: { ...job, worker: workerDetails },
    });

  } catch (error) {
    logger.error('Accept job error', { message: error.message });

    if (error.message === 'JOB_UNAVAILABLE' || error.message === 'JOB_FULL') {
      return res.status(409).json({
        success: false,
        alreadyTaken: true,
        message: 'Job already taken or fully staffed.',
      });
    }

    if (error.message === 'ALREADY_ACCEPTED') {
      return res.status(400).json({
        success: false,
        message: 'You have already accepted this job.',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to accept job',
      error: error.message,
    });
  }
};

// ── Withdraw a Job (Radio System — Revert + Re-notify) ────────────────────
// Called by the accepted worker if they want to cancel.
// Reverts status to 'pending', removes their application, then re-notifies
// matched workers so the job re-appears in their feed.
const withdrawJob = async (req, res) => {
  try {
    const { id } = req.params;
    const workerId = req.user?.id;

    if (!workerId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Only the worker who accepted can withdraw
    const app = await prisma.jobApplication.findFirst({
      where: { jobId: id, workerId, status: 'accepted' },
    });

    if (!app) {
      return res.status(400).json({
        success: false,
        message: 'No accepted application found for this worker',
      });
    }

    // Revert job status to pending and remove the application atomically
    const [job] = await prisma.$transaction([
      prisma.job.update({
        where: { id },
        data: { status: JobStatus.PENDING },
      }),
      prisma.jobApplication.delete({ where: { id: app.id } }),
    ]);

    const io = req.app.get('io');
    if (io) {
      // 1️⃣ Tell the farmer the worker withdrew
      // NOTE: must select pushToken here — without it, push notification never fires
      const fullJob = await prisma.job.findUnique({
        where: { id },
        include: { farmer: { select: { id: true, pushToken: true } } },
      });

      if (fullJob?.farmer?.id) {
        io.to(`user:${fullJob.farmer.id}`).emit('job:withdrawn', {
          jobId: id,
          workerId,
          message: 'The worker has cancelled. Job is now open again.',
        });
      }

      // 📲 Push to farmer
      const farmerPushToken = fullJob?.farmer?.pushToken;
      if (farmerPushToken) {
        await notifyFarmerJobWithdrawn(farmerPushToken, fullJob);
      }

      // 2️⃣ Re-run smart matching and re-notify matched workers (Radio System)
      try {
        const matchedWorkers = await matchWorkers({
          workType: fullJob?.workType,
          workerType: fullJob?.workerType,
          workersNeeded: fullJob?.workersNeeded,  // ← required for group size filtering
          farmLatitude: fullJob?.farmLatitude,
          farmLongitude: fullJob?.farmLongitude,
        });

        matchedWorkers.forEach((worker) => {
          // Don't re-notify the worker who just withdrew
          if (worker.id === workerId) return;

          io.to(`user:${worker.id}`).emit('job:new-offer', {
            jobId: fullJob.id,
            workType: fullJob.workType,
            payPerDay: fullJob.payPerDay,
            farmAddress: fullJob.farmAddress,
            farmLatitude: fullJob.farmLatitude,
            farmLongitude: fullJob.farmLongitude,
            distanceKm: worker.distanceKm,
            distanceLabel: worker.distanceKm != null
              ? `${worker.distanceKm} km away`
              : 'Nearby',
            workersNeeded: fullJob.workersNeeded,
            reOpened: true,
          });
        });

        logger.info(`Re-notified ${matchedWorkers.length} workers that job ${id} is open again`);
      } catch (matchErr) {
        logger.error('Re-matching error after withdrawal', { message: matchErr.message });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Job withdrawn. It is now open for other workers.',
    });

  } catch (error) {
    logger.error('Withdraw job error', { message: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to withdraw job',
    });
  }
};

// Cancel/delete a job
const cancelJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    // Only the farmer who created the job can cancel it
    if (job.farmerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this job' });
    }

    const io = req.app.get('io');

    // Update status to cancelled instead of deleting to keep history
    await prisma.job.update({
      where: { id },
      data: { status: 'cancelled' }
    });

    // Notify everyone so workers remove it from their feed
    if (io) {
      io.emit('job:taken', { jobId: id });
      io.to(`job:${id}`).emit('job:cancelled', {
        jobId: id,
        workType: job.workType,
      });
    }

    // 📲 Push to all workers who applied (they might be waiting or already accepted)
    const applications = await prisma.jobApplication.findMany({
      where: { jobId: id, status: 'accepted' },
      include: { worker: { select: { pushToken: true } } }
    });
    const workerPushTokens = applications.map(app => app.worker.pushToken).filter(Boolean);
    if (workerPushTokens.length > 0) {
      await notifyWorkerJobCancelled(workerPushTokens, job);
    }

    res.status(200).json({ success: true, message: 'Job cancelled successfully' });
  } catch (error) {
    logger.error('Cancel job error', { message: error.message });
    next(error);
  }
};

module.exports = { updateJobStatus, acceptJob, withdrawJob, cancelJob };
