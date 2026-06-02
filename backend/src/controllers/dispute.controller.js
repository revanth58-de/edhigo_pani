const prisma = require('../config/database');
const { logger } = require('../middleware/errorHandler');

// POST /api/disputes - File a new dispute
const createDispute = async (req, res, next) => {
  try {
    const { jobId, paymentId, category, description } = req.body;
    const initiatorId = req.user.id;

    logger.info('Creating a new dispute', { initiatorId, jobId, paymentId, category });

    if (!jobId || !category || !description) {
      return res.status(400).json({ error: 'Job ID, category, and description are required' });
    }

    // Verify Job exists
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Verify Payment exists if paymentId is provided
    if (paymentId) {
      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }
    }

    // Verify authorization: caller must be farmer, worker or leader of this job
    let isAuthorized = false;
    if (job.farmerId === initiatorId) {
      isAuthorized = true;
    } else {
      // Check if user is a matched worker (checked-in, has attendance, or application accepted)
      const attendance = await prisma.attendance.findFirst({
        where: { jobId, workerId: initiatorId },
      });
      if (attendance) {
        isAuthorized = true;
      } else {
        const application = await prisma.jobApplication.findFirst({
          where: { jobId, workerId: initiatorId, status: 'accepted' },
        });
        if (application) {
          isAuthorized = true;
        } else {
          // Check if worker is part of a group accepted for this job
          const groupMember = await prisma.groupMember.findFirst({
            where: {
              workerId: initiatorId,
            }
          });
          if (groupMember) {
            // Check if group has accepted application for this job
            const groupApp = await prisma.jobApplication.findFirst({
              where: { jobId, groupId: groupMember.groupId, status: 'accepted' },
            });
            if (groupApp) {
              isAuthorized = true;
            }
          }
        }
      }
    }

    // Also authorize if the initiator is a Group Leader who accepted this job
    // Also authorize if the initiator is a Group Leader who accepted this job
    if (!isAuthorized) {
      const myGroups = await prisma.group.findMany({
        where: { leaderId: initiatorId },
        select: { id: true }
      });
      const groupIds = myGroups.map(g => g.id);
      if (groupIds.length > 0) {
        const groupApp = await prisma.jobApplication.findFirst({
          where: {
            jobId,
            status: 'accepted',
            groupId: { in: groupIds },
          },
        });
        if (groupApp) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'You are not authorized to file a dispute for this job' });
    }

    // Create the dispute
    const dispute = await prisma.dispute.create({
      data: {
        jobId,
        initiatorId,
        paymentId: paymentId || null,
        category,
        description,
        status: 'pending',
      },
      include: {
        job: true,
        payment: true,
      },
    });

    return res.status(201).json({
      success: true,
      dispute,
    });
  } catch (error) {
    logger.error('Failed to create dispute:', error);
    next(error);
  }
};

// GET /api/disputes/my - Get disputes filed by the current user
const getMyDisputes = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const disputes = await prisma.dispute.findMany({
      where: { initiatorId: userId },
      include: {
        job: {
          include: {
            farmer: {
              select: { id: true, name: true, phone: true }
            }
          }
        },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      disputes,
    });
  } catch (error) {
    logger.error('Failed to get user disputes:', error);
    next(error);
  }
};

// GET /api/disputes/job/:jobId - Get disputes related to a specific job
const getJobDisputes = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    // Check permissions
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.farmerId !== userId) {
      const attendance = await prisma.attendance.findFirst({
        where: { jobId, workerId: userId },
      });
      const application = await prisma.jobApplication.findFirst({
        where: { jobId, workerId: userId, status: 'accepted' },
      });
      const isLeader = await prisma.jobApplication.findFirst({
        where: { jobId, status: 'accepted', group: { leaderId: userId } }
      });

      if (!attendance && !application && !isLeader) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const disputes = await prisma.dispute.findMany({
      where: { jobId },
      include: {
        initiator: {
          select: { id: true, name: true, role: true, phone: true }
        },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      disputes,
    });
  } catch (error) {
    logger.error('Failed to get job disputes:', error);
    next(error);
  }
};

module.exports = {
  createDispute,
  getMyDisputes,
  getJobDisputes,
};
