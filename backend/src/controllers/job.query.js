const prisma = require('../config/database');
const { logger } = require('../middleware/errorHandler');

// Get all jobs (with optional filters)
const getJobs = async (req, res, next) => {
  try {
    const { status, workType, workerType } = req.query;
    
    const where = {};
    if (status) {
      where.status = status;
    } else {
      where.status = 'pending';
    }
    if (workType) {
      where.workType = workType;
    }
    if (workerType) {
      where.workerType = workerType;
    }

    const jobs = await prisma.job.findMany({
      where,
      include: {
        farmer: {
          select: {
            id: true,
            name: true,
            phone: true,
            ratingAvg: true,
            photoUrl: true,
            village: true,
          }
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
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      data: jobs
    });
  } catch (error) {
    logger.error('Get jobs query error', { message: error.message });
    next(error);
  }
};

// Get a single job by ID
const getJobById = async (req, res, next) => {
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
            ratingAvg: true,
            photoUrl: true,
            village: true,
          }
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
              }
            }
          }
        },
        attendances: {
          include: {
            worker: {
              select: {
                id: true,
                name: true,
                photoUrl: true,
              }
            }
          }
        }
      }
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.status(200).json({
      success: true,
      data: job
    });
  } catch (error) {
    logger.error('Get job by ID query error', { message: error.message });
    next(error);
  }
};

// Get jobs posted by the authenticated farmer
const getMyJobs = async (req, res, next) => {
  try {
    const farmerId = req.user?.id;
    if (!farmerId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const jobs = await prisma.job.findMany({
      where: { farmerId },
      include: {
        applications: {
          include: {
            worker: {
              select: {
                id: true,
                name: true,
                phone: true,
                photoUrl: true,
                ratingAvg: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      data: jobs
    });
  } catch (error) {
    logger.error('Get my jobs query error', { message: error.message });
    next(error);
  }
};

// Get jobs the authenticated worker has attended (history)
const getWorkerHistory = async (req, res, next) => {
  try {
    const workerId = req.user?.id;
    if (!workerId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // A worker's history comprises jobs they have an accepted application for,
    // and where the job status is in 'completed', 'in_progress', or even 'accepted'.
    const applications = await prisma.jobApplication.findMany({
      where: {
        workerId,
        status: 'accepted',
      },
      include: {
        job: {
          include: {
            farmer: {
              select: {
                id: true,
                name: true,
                phone: true,
                ratingAvg: true,
                photoUrl: true,
              }
            }
          }
        }
      },
      orderBy: { appliedAt: 'desc' }
    });

    const jobs = applications.map(app => app.job).filter(Boolean);

    res.status(200).json({
      success: true,
      data: jobs
    });
  } catch (error) {
    logger.error('Get worker history query error', { message: error.message });
    next(error);
  }
};

// Get all jobs the worker applied for
const getWorkerJobs = async (req, res, next) => {
  try {
    const workerId = req.user?.id;
    if (!workerId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const applications = await prisma.jobApplication.findMany({
      where: { workerId },
      include: {
        job: {
          include: {
            farmer: {
              select: {
                id: true,
                name: true,
                phone: true,
                ratingAvg: true,
                photoUrl: true,
              }
            }
          }
        }
      },
      orderBy: { appliedAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      data: applications
    });
  } catch (error) {
    logger.error('Get worker jobs query error', { message: error.message });
    next(error);
  }
};

// Get nearby workers
const getNearbyWorkers = async (req, res, next) => {
  try {
    const { latitude, longitude, radius = 50 } = req.query; // default radius is 50km

    const workers = await prisma.user.findMany({
      where: {
        role: { in: ['worker', 'leader'] },
        latitude: { not: null },
        longitude: { not: null },
        deletedAt: null, // respect soft-delete
      },
      select: {
        id: true,
        name: true,
        phone: true,
        photoUrl: true,
        ratingAvg: true,
        skills: true,
        latitude: true,
        longitude: true,
        status: true,
        experience: true,
      }
    });

    if (latitude && longitude) {
      const lat1 = parseFloat(latitude);
      const lon1 = parseFloat(longitude);

      const workersWithDistance = workers.map(worker => {
        const lat2 = worker.latitude;
        const lon2 = worker.longitude;

        const R = 6371; // Radius of the Earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = R * c;

        return { ...worker, distanceKm: parseFloat(distanceKm.toFixed(2)) };
      })
      .filter(worker => worker.distanceKm <= parseFloat(radius))
      .sort((a, b) => a.distanceKm - b.distanceKm);

      return res.status(200).json({
        success: true,
        data: workersWithDistance
      });
    }

    res.status(200).json({
      success: true,
      data: workers
    });
  } catch (error) {
    logger.error('Get nearby workers query error', { message: error.message });
    next(error);
  }
};

module.exports = {
  getJobs,
  getJobById,
  getMyJobs,
  getWorkerHistory,
  getWorkerJobs,
  getNearbyWorkers,
};
