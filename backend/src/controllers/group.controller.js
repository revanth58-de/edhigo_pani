const prisma = require('../config/database');
const { getIO } = require('../config/socket');

// GET /api/groups/my-groups - Get all groups led by or containing current user
const getMyGroups = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const groups = await prisma.group.findMany({
      where: {
        OR: [
          { leaderId: userId },
          {
            members: {
              some: {
                workerId: userId,
                status: { not: 'invited' }, // joined, checked_in, checked_out
              },
            },
          },
        ],
      },
      include: {
        members: {
          include: {
            worker: { select: { id: true, name: true, phone: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ groups });
  } catch (error) {
    next(error);
  }
};

// POST /api/groups - Create a group
const createGroup = async (req, res, next) => {
  try {
    const { name, type, description, photoUrl, memberCount } = req.body;
    const leaderId = req.user.id; // From JWT token

    console.log('👥 Create Group:', { leaderId, name, type, memberCount });

    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const group = await prisma.group.create({
      data: {
        leaderId,
        name,
        type,
        description,
        photoUrl,
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

// GET /api/groups/pending-invites — worker fetches their own unread group invites
const getMyPendingInvites = async (req, res, next) => {
  try {
    const workerId = req.user.id;
    const invites = await prisma.groupMember.findMany({
      where: { workerId, status: 'invited' },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            leader: { select: { id: true, name: true } },
          },
        },
      },
    });
    res.json({ invites });
  } catch (error) {
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

    // Separate joined members from invited-but-pending members
    const joinedMembers = group.members.filter(m => m.status === 'joined');
    const pendingInvites = group.members.filter(m => m.status === 'invited');

    res.json({ group: { ...group, members: joinedMembers, pendingInvites } });
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
        status: 'pending',
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

    // Atomic update — only succeeds if the job is still 'pending' (race condition safe)
    const { count } = await prisma.job.updateMany({
      where: { id: jobId, status: 'pending' },
      data: { status: 'matched' },
    });

    if (count === 0) {
      // Either job doesn't exist or it was already taken
      const existingJob = await prisma.job.findUnique({ where: { id: jobId }, select: { status: true } });
      if (!existingJob) return res.status(404).json({ error: 'Job not found' });
      return res.status(409).json({ error: 'Job is no longer available', alreadyTaken: true });
    }

    // Create job application for the group
    await prisma.jobApplication.create({
      data: {
        jobId,
        workerId: req.user.id,
        groupId,
        status: 'accepted',
      },
    });

    const updatedJob = await prisma.job.findUnique({ where: { id: jobId } });

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
    const { workerId, name, role } = req.body;

    console.log('➕ Add Member:', { groupId, workerId, name, role });

    if (!workerId) {
      return res.status(400).json({ error: 'Worker ID is required' });
    }

    // Verify group exists and caller is the leader
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    if (group.leaderId !== req.user.id) {
      return res.status(403).json({ error: 'Only the group leader can add members' });
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
        name: name || worker.name,
        role: role || 'Member',
        status: 'invited',   // Worker must accept — not joined yet
      },
    });

    console.log('✅ Member added:', member.id);

    // Notify the worker via socket (if online)
    const io = getIO();
    const leader = await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } });
    if (io) {
      io.to(`user:${workerId}`).emit('group:invite', {
        groupId,
        groupName: group.name,
        leaderId: req.user.id,
        leaderName: leader?.name || 'Group Leader',
        inviteId: member.id,
      });
    }

    res.status(201).json({
      message: 'Member added to group',
      member,
    });
  } catch (error) {
    console.error('💥 Add Member Error:', error);
    next(error);
  }
};

// POST /api/groups/:groupId/members/by-phone - Add member by phone
const addMemberByPhone = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { phone, name, role } = req.body;

    console.log('📱 Add Member By Phone:', { groupId, phone, name, role });

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Find or create user
    let user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      // Create a placeholder user
      user = await prisma.user.create({
        data: {
          phone,
          name: name || 'Group Member',
          role: 'worker',
          status: 'offline',
        },
      });
    }

    // Check if group exists and user is leader
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.leaderId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    // Check if already a member
    const existing = await prisma.groupMember.findFirst({
      where: { groupId, workerId: user.id },
    });
    if (existing) {
      return res.status(400).json({ error: 'User is already in this group' });
    }

    const member = await prisma.groupMember.create({
      data: {
        groupId,
        workerId: user.id,
        name: name || user.name,
        role: role || 'Member',
        status: 'invited',   // Worker must accept — not joined yet
      },
    });

    // Notify the worker via socket (if online)
    const io = getIO();
    const leader = await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } });
    if (io) {
      io.to(`user:${user.id}`).emit('group:invite', {
        groupId,
        groupName: group.name,
        leaderId: req.user.id,
        leaderName: leader?.name || 'Group Leader',
        inviteId: member.id,
      });
    }

    res.status(201).json({ message: 'Member added', member });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/groups/:groupId/members/:workerId - Update member metadata
const updateMember = async (req, res, next) => {
  try {
    const { groupId, workerId } = req.params;
    const { name, role } = req.body;

    // Verify user is leader
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.leaderId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    await prisma.groupMember.updateMany({
      where: { groupId, workerId },
      data: { name, role },
    });

    res.json({ message: 'Member updated successfully' });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/groups/:groupId/members/:workerId - Remove member
const removeMember = async (req, res, next) => {
  try {
    const { groupId, workerId } = req.params;

    console.log('➖ Remove Member:', { groupId, workerId });

    // Verify user is leader
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.leaderId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    await prisma.groupMember.deleteMany({
      where: { groupId, workerId },
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/groups/:groupId/status - Update group status (e.g., to 'available')
const updateGroupStatus = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { status } = req.body;

    console.log('🔄 Update Group Status:', { groupId, status });

    // Verify group exists and caller is the leader
    const existing = await prisma.group.findUnique({ where: { id: groupId } });
    if (!existing) return res.status(404).json({ error: 'Group not found' });
    if (existing.leaderId !== req.user.id) return res.status(403).json({ error: 'Not authorized to update this group' });

    const validStatuses = ['forming', 'available', 'working', 'inactive'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const group = await prisma.group.update({
      where: { id: groupId },
      data: { status },
    });

    res.json({ message: 'Status updated', group });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyGroups,
  createGroup,
  getGroupDetails,
  getGroupJobs,
  acceptGroupJob,
  addMember,
  addMemberByPhone,
  updateMember,
  removeMember,
  updateGroupStatus,

  // POST /api/groups/:groupId/respond-invite — worker accepts or rejects a group invite
  respondToInvite: async (req, res, next) => {
    try {
      const { groupId } = req.params;
      const { inviteId, action } = req.body; // action: 'accept' | 'reject'
      const workerId = req.user.id;

      if (!['accept', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'action must be "accept" or "reject"' });
      }

      const member = await prisma.groupMember.findFirst({
        where: { groupId, workerId },
      });

      if (!member) {
        return res.status(404).json({ error: 'Invite not found' });
      }

      if (action === 'reject') {
        await prisma.groupMember.delete({ where: { id: member.id } });
        return res.json({ message: 'Invite rejected' });
      }

      // Accept — update status to 'joined'
      await prisma.groupMember.update({
        where: { id: member.id },
        data: { status: 'joined', joinedAt: new Date() },
      });

      res.json({ message: 'You have joined the group' });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/groups/:groupId — leader deletes the whole group
  deleteGroup: async (req, res, next) => {
    try {
      const { groupId } = req.params;
      const leaderId = req.user.id;

      const group = await prisma.group.findUnique({ where: { id: groupId } });
      if (!group) return res.status(404).json({ error: 'Group not found' });
      if (group.leaderId !== leaderId) return res.status(403).json({ error: 'Only the group leader can delete the group' });

      // Cascade delete members and messages first (Prisma SQLite doesn't cascade automatically)
      await prisma.groupMessage.deleteMany({ where: { groupId } });
      await prisma.groupMember.deleteMany({ where: { groupId } });
      await prisma.group.delete({ where: { id: groupId } });

      // Notify all members via socket
      const io = getIO();
      if (io) io.to(`group:${groupId}`).emit('group:deleted', { groupId });

      res.json({ message: 'Group deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/groups/:groupId/exit — worker leaves the group themselves
  exitGroup: async (req, res, next) => {
    try {
      const { groupId } = req.params;
      const workerId = req.user.id;

      const member = await prisma.groupMember.findFirst({
        where: { groupId, workerId },
      });

      if (!member) return res.status(404).json({ error: 'You are not a member of this group' });

      await prisma.groupMember.delete({ where: { id: member.id } });

      res.json({ message: 'You have left the group' });
    } catch (error) {
      next(error);
    }
  },
};

// Re-export getMyPendingInvites so it can be used in routes
module.exports.getMyPendingInvites = getMyPendingInvites;
