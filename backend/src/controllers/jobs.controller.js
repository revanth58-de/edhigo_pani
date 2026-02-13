const prisma = require('../config/database');
const { getIO } = require('../config/socket'); // Assuming socket export (need to check server.js)

// POST /api/jobs
const createJob = async (req, res, next) => {
  try {
    const { workType, workerType, workersNeeded, payPerDay, farmLatitude, farmLongitude, farmAddress } = req.body;
    const farmerId = req.user.id;

    // Validate inputs
    if (!workType || !payPerDay) {
      return res.status(400).json({ error: 'Work type and pay per day are required' });
    }

    // Create Job in DB
    const job = await prisma.job.create({
      data: {
        farmerId,
        workType,
        workerType: workerType || 'individual',
        workersNeeded: workersNeeded || 1,
        payPerDay: parseFloat(payPerDay),
        farmLatitude,
        farmLongitude,
        farmAddress,
        status: 'pending',
      },
      include: {
        farmer: {
          select: { name: true, phone: true, ratingAvg: true }
        }
      }
    });

    // Notify nearby workers via Socket.io
    // For MVP, we'll just broadcast to "workers" room if it exists, or emit globally for now
    // In production, use geospatial filtering
    const io = getIO();
    if (io) {
        io.emit('job:new-offer', {
            jobId: job.id,
            workType: job.workType,
            payPerDay: job.payPerDay,
            distance: '2.5 km', // Placeholder distance calculation
            farmerName: job.farmer.name
        });
    }

    res.status(201).json({
      message: 'Job created successfully',
      job,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/jobs/nearby
const getNearbyJobs = async (req, res, next) => {
    try {
        // Mock query for nearby jobs
        // In real app: use Haversine/PostGIS
        const jobs = await prisma.job.findMany({
            where: { status: 'pending' },
            include: { farmer: true },
            take: 20,
            orderBy: { createdAt: 'desc' }
        });
        
        res.json(jobs);
    } catch (error) {
        next(error);
    }
};

module.exports = { createJob, getNearbyJobs };
