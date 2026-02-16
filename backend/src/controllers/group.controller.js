const prisma = require('../config/database');

// POST /api/groups - Create a group
const createGroup = async (req, res, next) => {
  try {
    const { name, memberCount } = req.body;
    const leaderId = req.user.id; // From JWT token

    console.log('👥 Create Group:', { leaderId, name, memberCount });

    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const group = await prisma.group.create({
      data: {
        leaderId,
        name,
        status: 'forming',
      },
    });

    console.log('✅ Group created:', group.id);

    res.status(201).json({
      message: 'Group created successfully',
      group,
    });
  } catch (error) {
    console.error('💥 Create Group Error:', error);
    next(error);
  }
};

// GET /api/groups/:groupId - Get group details
const getGroupDetails = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        leader: {
          select: { id: true, name: true, phone: true },
        },
        members: {
          include: {
            worker: {
              select: { id: true, name: true, phone: true, skills: true, ratingAvg: true },
            },
          },
        },
      },
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.json({ group });
  } catch (error) {
    console.error('💥 Get Group Details Error:', error);
    next(error);
  }
};

// GET /api/groups/:groupId/jobs - Get jobs available for a group
const getGroupJobs = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    // Get group to verify it exists
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Find jobs that want group workers and are still pending
    const jobs = await prisma.job.findMany({
      where: {
        workerType: 'group',
        status: { in: ['pending', 'matched'] },
      },
      include: {
        farmer: {
          select: { id: true, name: true, phone: true, village: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      jobs,
      count: jobs.length,
    });
  } catch (error) {
    console.error('💥 Get Group Jobs Error:', error);
    next(error);
  }
};

// POST /api/groups/accept-job - Accept a job as a group
const acceptGroupJob = async (req, res, next) => {
  try {
    const { groupId, jobId } = req.body;

    console.log('👥 Group Accept Job:', { groupId, jobId });

    if (!groupId || !jobId) {
      return res.status(400).json({ error: 'Group ID and Job ID are required' });
    }

    // Verify group exists and user is leader
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (group.leaderId !== req.user.id) {
      return res.status(403).json({ error: 'Only the group leader can accept jobs' });
    }

    // Verify job exists and is available
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'pending') {
      return res.status(400).json({ error: 'Job is no longer available' });
    }

    // Update job status
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: { status: 'matched' },
    });

    // Create job application for the group
    await prisma.jobApplication.create({
      data: {
        jobId,
        workerId: req.user.id,
        groupId,
        status: 'accepted',
      },
    });

    console.log('✅ Group accepted job:', { groupId, jobId });

    res.json({
      message: 'Job accepted by group',
      job: updatedJob,
    });
  } catch (error) {
    console.error('💥 Accept Group Job Error:', error);
    next(error);
  }
};

// POST /api/groups/:groupId/members - Add a member to group
const addMember = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { workerId } = req.body;

    console.log('➕ Add Member:', { groupId, workerId });

    if (!workerId) {
      return res.status(400).json({ error: 'Worker ID is required' });
    }

    // Verify group exists
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Verify worker exists
    const worker = await prisma.user.findUnique({ where: { id: workerId } });
    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    // Check if already a member
    const existing = await prisma.groupMember.findFirst({
      where: { groupId, workerId },
    });

    if (existing) {
      return res.status(400).json({ error: 'Worker is already a member of this group' });
    }

    const member = await prisma.groupMember.create({
      data: {
        groupId,
        workerId,
        status: 'invited',
      },
    });

    console.log('✅ Member added:', member.id);

    res.status(201).json({
      message: 'Member added to group',
      member,
    });
  } catch (error) {
    console.error('💥 Add Member Error:', error);
    next(error);
  }
};

module.exports = { createGroup, getGroupDetails, getGroupJobs, acceptGroupJob, addMember };
