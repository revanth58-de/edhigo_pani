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
      jobs,
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

    // Find the accepted application that represents a group
    const groupApp = job.applications.find(a => a.status === 'accepted' && a.groupId);
    if (groupApp) {
      // Fetch all joined group members
      const members = await prisma.groupMember.findMany({
        where: { groupId: groupApp.groupId, status: { not: 'invited' } },
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
      });

      // Map group members to match job application worker structure
      const memberApps = members.map(m => ({
        id: `group-member-${m.id}`,
        jobId: job.id,
        workerId: m.workerId,
        groupId: groupApp.groupId,
        status: 'accepted',
        appliedAt: m.joinedAt || m.createdAt,
        worker: m.worker
      }));

      // Append to job.applications
      job.applications = [...job.applications, ...memberApps];
    }

    res.status(200).json({
      success: true,
      job,
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
      jobs,
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
      jobs,
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
      applications,
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
        location: { isNot: null },
        deletedAt: null, // respect soft-delete
        status: { in: ['available', 'working', 'on_break', 'online'] },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        photoUrl: true,
        ratingAvg: true,
        skills: true,
        location: true,
        status: true,
        experience: true,
        dailyWage: true,
        cropExperience: true,
      }
    });

    const mappedWorkers = workers.map(worker => {
      const latVal = worker.location ? worker.location.latitude : null;
      const lngVal = worker.location ? worker.location.longitude : null;
      const { location, ...safeWorker } = worker;
      return {
        ...safeWorker,
        latitude: latVal,
        longitude: lngVal
      };
    });

    if (latitude && longitude) {
      const lat1 = parseFloat(latitude);
      const lon1 = parseFloat(longitude);

      const workersWithDistance = mappedWorkers.map(worker => {
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
        workers: workersWithDistance,
        data: workersWithDistance
      });
    }

    res.status(200).json({
      success: true,
      workers: mappedWorkers,
      data: mappedWorkers
    });
  } catch (error) {
    logger.error('Get nearby workers query error', { message: error.message });
    next(error);
  }
};

// Get platform wage benchmark rates & minimum wage policy
const getWageRates = async (req, res, next) => {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            'wages.minDailyWage',
            'wages.enforceMinimum',
            'wages.cropRates',
            'wages.constructionRates',
            'wages.skilledTradeRates',
          ]
        }
      }
    });

    const configMap = {
      minDailyWage: 400,
      enforceMinimum: true,
      cropRates: {
        paddy_harvesting: 500,
        sugarcane_cutting: 600,
        watering: 350,
        ploughing: 450,
        cotton_picking: 480,
        chilli_harvesting: 520,
      },
      constructionRates: {
        earthwork_excavation: 550,
        earthwork_grading: 500,
        earthwork_compaction: 480,
        earthwork_tunneling: 600,
        concrete_mixing: 550,
        concrete_formwork: 650,
        concrete_pouring: 600,
        concrete_shotcrete: 700,
        concrete_curing: 450,
        structural_scaffolding: 650,
        structural_bracing: 600,
        structural_temporary: 550,
        utility_drainage: 580,
        utility_conduits: 620,
        utility_storm_drains: 560,
        maintenance_cleanup: 450,
        maintenance_tools: 500,
        maintenance_traffic: 480,
      },
      skilledTradeRates: {
        mason: 800,
        carpenter: 800,
        plumber: 750,
        electrician: 750,
        welder: 750,
        painter: 700,
        machinery_operator: 900,
        steel_erector: 800,
      },
    };

    settings.forEach((s) => {
      if (s.key === 'wages.minDailyWage') configMap.minDailyWage = parseFloat(s.value) || 400;
      if (s.key === 'wages.enforceMinimum') configMap.enforceMinimum = s.value !== 'false';
      if (s.key === 'wages.cropRates') {
        try { configMap.cropRates = { ...configMap.cropRates, ...JSON.parse(s.value) }; } catch (_) {}
      }
      if (s.key === 'wages.constructionRates') {
        try { configMap.constructionRates = { ...configMap.constructionRates, ...JSON.parse(s.value) }; } catch (_) {}
      }
      if (s.key === 'wages.skilledTradeRates') {
        try { configMap.skilledTradeRates = { ...configMap.skilledTradeRates, ...JSON.parse(s.value) }; } catch (_) {}
      }
    });

    res.status(200).json({
      success: true,
      data: configMap,
    });
  } catch (error) {
    logger.error('Get wage rates error', { message: error.message });
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
  getWageRates,
};
