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
            photoUrl: true,
            ratingAvg: true,
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

    console.log('📥 Accept Job Request:', { jobId: id, workerId });

    // Check if job exists
    const existingJob = await prisma.job.findUnique({ where: { id } });
    console.log('🔍 Job Found:', existingJob ? { id: existingJob.id, status: existingJob.status } : 'NOT FOUND');

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
        // In a real app we'd add the worker to a relation, 
        // but schema.prisma shows `workersNeeded` and `applications`.
        // Let's create an application record automatically.
      },
    });

    await prisma.jobApplication.create({
      data: {
        jobId: id,
        workerId,
        status: 'accepted'
      }
    });

    // Notify Farmer
    const io = req.app.get('io');
    if (io) {
      io.to(`job:${id}`).emit('job:accepted', {
        jobId: id,
        workerId
      });
    }

    res.status(200).json({
      success: true,
      message: 'Job accepted successfully',
      data: job
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

module.exports = {
  createJob,
  getJobs,
  updateJobStatus,
  acceptJob,
  getMyJobs,
};
