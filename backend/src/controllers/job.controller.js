const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create a new job
const createJob = async (req, res) => {
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

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: job,
    });
  } catch (error) {
    console.error('Create Job Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create job',
      error: error.message,
    });
  }
};

// Get all jobs (with optional filters)
const getJobs = async (req, res) => {
  try {
    const { status, farmerId, id } = req.query;

    const where = {};
    if (id) where.id = id;
    if (status) where.status = status;
    if (farmerId) where.farmerId = farmerId;

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
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs',
      error: error.message,
    });
  }
};

// Get a single job by ID (with full relations)
const getJobById = async (req, res) => {
  try {
    const { id } = req.params;

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
                latitude: true,
                longitude: true,
              },
            },
          },
        },
      },
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

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

// Accept a job
const acceptJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { workerId } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    console.log(`📥 [${new Date().toISOString()}] Accept Job Request from IP: ${ip}`);
    console.log('📦 Request Body:', req.body);
    console.log('📦 Job ID from Params:', id);

    // Check if job exists
    const existingJob = await prisma.job.findUnique({ where: { id } });
    console.log('🔍 Database Job Check:', existingJob
      ? { id: existingJob.id, status: existingJob.status, farmerId: existingJob.farmerId }
      : 'NOT FOUND'
    );

    if (!existingJob) {
      console.log('❌ Job not found');
      return res.status(400).json({
        success: false,
        message: 'Job not found'
      });
    }

    if (existingJob.status !== 'pending') {
      console.log('❌ Job not pending, current status:', existingJob.status);
      return res.status(400).json({
        success: false,
        message: `Job is no longer available (status: ${existingJob.status})`
      });
    }

    // Update job status and assign worker (for individual jobs, we might want a separate assignment table, 
    // but for simplicity we'll just mark it 'matched' and handle applications logic if needed. 
    // In this simple flow, "Accept" = "Matched")

    // For this MVP, we assume 1-1 matching for individual jobs
    const job = await prisma.job.update({
      where: { id },
      data: {
        status: 'matched',
      },
    });

    await prisma.jobApplication.create({
      data: {
        jobId: id,
        workerId,
        status: 'accepted'
      }
    });

    // Fetch worker details to include in the notification
    const workerDetails = await prisma.user.findUnique({
      where: { id: workerId },
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
    });

    // Notify Farmer with worker details
    const io = req.app.get('io');
    if (io) {
      io.to(`job:${id}`).emit('job:accepted', {
        jobId: id,
        workerId,
        workerName: workerDetails?.name || 'Worker',
        workerPhone: workerDetails?.phone || null,
        workerPhotoUrl: workerDetails?.photoUrl || null,
        workerRating: workerDetails?.ratingAvg || 0,
        workerSkills: workerDetails?.skills || null,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Job accepted successfully',
      data: { ...job, worker: workerDetails },
    });

  } catch (error) {
    console.error('Accept Job Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept job',
      error: error.message
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

// Cancel a job
const cancelJob = async (req, res) => {
  try {
    const { id } = req.params;

    const existingJob = await prisma.job.findUnique({
      where: { id },
      include: {
        farmer: { select: { name: true } },
        applications: {
          where: { status: 'accepted' },
          select: { workerId: true },
        },
      },
    });
    if (!existingJob) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const job = await prisma.job.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    // Notify via Socket.io
    const io = req.app.get('io');
    if (io) {
      const cancelPayload = {
        jobId: id,
        workType: existingJob.workType || 'job',
        farmerName: existingJob.farmer?.name || 'Farmer',
      };

      // Notify everyone in the job room
      io.to(`job:${id}`).emit('job:cancelled', cancelPayload);

      // Also notify each accepted worker via their personal room
      if (existingJob.applications && existingJob.applications.length > 0) {
        existingJob.applications.forEach((app) => {
          io.to(`user:${app.workerId}`).emit('worker:job_cancelled', cancelPayload);
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Job cancelled successfully',
      data: job,
    });
  } catch (error) {
    console.error('Cancel Job Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel job',
      error: error.message,
    });
  }
};

// Get nearby available workers (for farmer map display)
const getNearbyWorkers = async (req, res) => {
  try {
    const workers = await prisma.user.findMany({
      where: {
        role: 'worker',
        status: { in: ['available', 'online'] },
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        skills: true,
        ratingAvg: true,
        village: true,
        status: true,
      },
      take: 50,
    });

    res.status(200).json({
      success: true,
      data: workers,
    });
  } catch (error) {
    console.error('Get Nearby Workers Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nearby workers',
      error: error.message,
    });
  }
};

module.exports = {
  createJob,
  getJobs,
  getJobById,
  updateJobStatus,
  acceptJob,
  cancelJob,
  getMyJobs,
  getNearbyWorkers,
};
