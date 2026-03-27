const prisma = require('../config/database'); // shared singleton — avoids connection pool exhaustion
const { matchWorkers } = require('../services/matchWorkers');
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
        status: 'pending',
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
          farmLatitude: farmLatitude ? parseFloat(farmLatitude) : null,
          farmLongitude: farmLongitude ? parseFloat(farmLongitude) : null,
        });

        console.log(`🎯 Job ${job.id}: matched ${matchedWorkers.length} workers for workType="${workType}"`);

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
        console.error('⚠️ Worker matching error (job still created):', matchErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: job,
    });
  } catch (error) {
    console.error('Create Job Error:', error);
    next(error);
  }
};


// Get all jobs (with optional filters)
const getJobs = async (req, res, next) => {
  try {
    const { status, farmerId, id, workerId } = req.query;

    const where = {};
    if (id) where.id = id;
    if (status) where.status = status;
    if (farmerId) where.farmerId = farmerId;
    // Worker history: filter jobs where the worker has an individual application 
    // OR where they are part of a group that has an application
    if (workerId) {
      where.applications = { some: { workerId } };
    }

    const jobs = await prisma.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        farmer: {
          select: {
            name: true,
            phone: true,
            photoUrl: true,
            ratingAvg: true,
          },
        },
        applications: {
          include: {
            worker: {
              select: {
                id: true,
                name: true,
                phone: true,
                photoUrl: true,
                ratingAvg: true,
                skills: true,
                village: true,
                latitude: true,
                longitude: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: jobs,
    });
  } catch (error) {
    console.error('Get Jobs Error:', error);
    next(error);
  }
};

// Get a single job by ID (with full relations)
const getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        farmer: {
          select: {
            id: true,
            name: true,
            phone: true,
            photoUrl: true,
            ratingAvg: true,
            village: true,
          },
        },
        applications: {
          include: {
            worker: {
              select: {
                id: true,
                name: true,
                phone: true,
                photoUrl: true,
                ratingAvg: true,
                skills: true,
                village: true,
              },
            },
          },
        },
      },
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // ── Authorization Logic (IDOR Protection) ───────────────────────
    const isFarmer = job.farmerId === userId;
    const userApplication = job.applications.find(app => app.workerId === userId);
    const isWorker = !!userApplication;

    // 1. If not the farmer and not an assigned worker, restrict data
    if (!isFarmer && !isWorker) {
      // If job is no longer pending, hidden it from non-participants entirely
      if (job.status !== 'pending') {
        return res.status(403).json({ success: false, message: 'Not authorized to view this job record' });
      }

      // If pending, allow discovery but sanitize sensitive fields
      const sanitizedJob = {
        ...job,
        farmer: { ...job.farmer, phone: null }, // Hide farmer phone from non-applicants
        applications: [], // Hide who else applied
      };
      
      return res.status(200).json({
        success: true,
        data: sanitizedJob,
      });
    }

    // 2. If it's a worker who applied/accepted, they see farmer phone but NOT other applications
    if (isWorker && !isFarmer) {
      return res.status(200).json({
        success: true,
        data: {
          ...job,
          applications: job.applications.filter(app => app.workerId === userId), // Only see their own status
        }
      });
    }

    // 3. Farmer sees everything
    res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error('Get Job By ID Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job',
      error: error.message,
    });
  }
};

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
    console.error('Update Job Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update job',
      error: error.message,
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

      if (!currentJob || currentJob.status !== 'pending') {
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

      if (acceptedCount >= currentJob.workersNeeded) {
        throw new Error('JOB_FULL');
      }

      // Accept this worker
      if (!existingApp) {
        await tx.jobApplication.create({
          data: { jobId: id, workerId, status: 'accepted' },
        });
      } else {
        await tx.jobApplication.update({
          where: { id: existingApp.id },
          data: { status: 'accepted' },
        });
      }

      const isNowFull = (acceptedCount + 1) >= currentJob.workersNeeded;

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
        console.log(`📡 Broadcast job:taken for job ${id} (Full)`);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Job accepted successfully',
      isFullyStaffed: isNowFull,
      data: { ...job, worker: workerDetails },
    });

  } catch (error) {
    console.error('Accept Job Error:', error);

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
        data: { status: 'pending' },
      }),
      prisma.jobApplication.delete({ where: { id: app.id } }),
    ]);

    const io = req.app.get('io');
    if (io) {
      // 1️⃣ Tell the farmer the worker withdrew
      const fullJob = await prisma.job.findUnique({
        where: { id },
        include: { farmer: { select: { id: true } } },
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

        console.log(`📡 Re-notified ${matchedWorkers.length} workers that job ${id} is open again.`);
      } catch (matchErr) {
        console.error('⚠️ Re-matching error after withdrawal:', matchErr.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Job withdrawn. It is now open for other workers.',
    });

  } catch (error) {
    console.error('Withdraw Job Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to withdraw job',
      error: error.message,
    });
  }
};

// GET /api/jobs/my-jobs - Get jobs posted by the authenticated farmer
const getMyJobs = async (req, res) => {
  try {
    const farmerId = req.user?.id;
    if (!farmerId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const jobs = await prisma.job.findMany({
      where: { farmerId },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: jobs,
    });
  } catch (error) {
    console.error('Get My Jobs Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your jobs',
      error: error.message,
    });
  }
};

// GET /api/jobs/worker-history — fetch jobs the current worker has attended
const getWorkerHistory = async (req, res) => {
  try {
    const workerId = req.user?.id;
    if (!workerId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Fetch via attendance records — avoids the complex workerId→application filter
    const attendances = await prisma.attendance.findMany({
      where: { workerId },
      orderBy: { checkIn: 'desc' },
      distinct: ['jobId'],
      include: {
        job: {
          include: {
            farmer: {
              select: { id: true, name: true, phone: true, photoUrl: true, ratingAvg: true }
            }
          }
        }
      }
    });

    const jobs = attendances.map(a => ({
      ...a.job,
      checkIn: a.checkIn,
      checkOut: a.checkOut,
      hoursWorked: a.hoursWorked,
    }));

    res.status(200).json({ success: true, data: jobs });
  } catch (error) {
    console.error('Get Worker History Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch work history', error: error.message });
  }
};

// GET /api/jobs/my-work — fetch all jobs the current worker has applied for / accepted
const getWorkerJobs = async (req, res) => {
  try {
    const workerId = req.user?.id;
    if (!workerId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const applications = await prisma.jobApplication.findMany({
      where: { workerId },
      orderBy: { appliedAt: 'desc' },
      include: {
        job: {
          include: {
            farmer: {
              select: { id: true, name: true, phone: true, photoUrl: true, ratingAvg: true, village: true }
            }
          }
        }
      }
    });

    const jobs = applications.map(app => ({
      ...app.job,
      applicationStatus: app.status,   // 'accepted' | 'pending' | 'rejected' | 'withdrawn'
      appliedAt: app.appliedAt,
    }));

    res.status(200).json({ success: true, data: jobs });
  } catch (error) {
    console.error('Get Worker Jobs Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch worker jobs', error: error.message });
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
    console.error('Cancel Job Error:', error);
    next(error);
  }
};

// Get nearby available workers (for farmer map display) — with real distances
const getNearbyWorkers = async (req, res) => {
  try {
    const { haversineKm, MAX_DISTANCE_KM } = require('../services/matchWorkers');
    const { lat, lng } = req.query; // farmer's current location
    const farmerLat = lat ? parseFloat(lat) : null;
    const farmerLng = lng ? parseFloat(lng) : null;

    const workers = await prisma.user.findMany({
      where: {
        role: 'worker',
        // Optional: filter where latitude/longitude is not null
      },
      select: {
        id: true,
        name: true,
        phone: true,
        photoUrl: true,
        ratingAvg: true,
        latitude: true,
        longitude: true,
        skills: true,
        village: true,
        status: true,
      },
      take: 100,
    });

    // Enrich with real distance and filter by radius if farmer location provided
    const enriched = workers
      .map((w) => {
        const distanceKm =
          farmerLat != null && farmerLng != null
            ? Math.round(haversineKm(farmerLat, farmerLng, w.latitude, w.longitude) * 10) / 10
            : null;
        return { ...w, distanceKm };
      })
      .filter((w) => w.distanceKm == null || w.distanceKm <= MAX_DISTANCE_KM)
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));

    res.status(200).json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    console.error('Get Nearby Workers Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch nearby workers', error: error.message });
  }
};

module.exports = {
  createJob,
  getJobs,
  getJobById,
  updateJobStatus,
  acceptJob,
  withdrawJob,
  cancelJob,
  getMyJobs,
  getWorkerHistory,
  getWorkerJobs,
  getNearbyWorkers,
};
