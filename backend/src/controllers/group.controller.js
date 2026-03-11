const prisma = require('../config/database');

// GET /api/groups/my-groups - Get all groups led by current user
const getMyGroups = async (req, res, next) => {
  try {
    const leaderId = req.user.id;
    const groups = await prisma.group.findMany({
      where: { leaderId },
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
          where: { status: 'joined' },   // ← only confirmed members, not pending invites
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

    // Atomic update — only succeeds if the job is still 'pending' (race condition safe)
    const { count } = await prisma.job.updateMany({
      where: { id: jobId, status: 'pending' },
      data: { status: 'accepted' },
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

    // Fetch full job with farmer info for socket notifications
    const updatedJob = await prisma.job.findUnique({
      where: { id: jobId },
      include: { farmer: { select: { id: true, name: true, phone: true } } },
    });

    // Fetch leader details for the notification payload
    const leader = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, phone: true, photoUrl: true, ratingAvg: true },
    });

    console.log('✅ Group accepted job:', { groupId, jobId });

    // ── Socket Notifications ─────────────────────────────────────────
    const io = req.app.get('io');
    if (io) {
      // 1️⃣ Notify farmer so their "Finding Workers" screen navigates forward
      if (updatedJob?.farmer?.id) {
        io.to(`user:${updatedJob.farmer.id}`).emit('job:accepted', {
          jobId,
          workerId: req.user.id,
          workerName: leader?.name || group.name,
          workerPhone: leader?.phone || null,
          workerPhotoUrl: leader?.photoUrl || null,
          workerRating: leader?.ratingAvg || 0,
          isFullyStaffed: true,
          isGroup: true,
          groupId,
          groupName: group.name,
        });
        console.log(`📡 job:accepted → farmer user:${updatedJob.farmer.id}`);
      }

      // 2️⃣ Notify ONLY confirmed (joined) group members
      const allMemberIds = [
        group.leaderId,
        ...group.members.filter((m) => m.status === 'joined').map((m) => m.workerId),
      ].filter((id, idx, arr) => id && arr.indexOf(id) === idx); // unique non-null

      allMemberIds.forEach((memberId) => {
        io.to(`user:${memberId}`).emit('group:job_accepted', {
          jobId,
          groupId,
          groupName: group.name,
          leaderName: leader?.name || 'Group Leader',
          workType: updatedJob?.workType,
          farmAddress: updatedJob?.farmAddress,
          payPerDay: updatedJob?.payPerDay,
        });
      });
      console.log(`📡 group:job_accepted → ${allMemberIds.length} members`);

      // 3️⃣ Global broadcast so other workers remove this job from their feed
      io.emit('job:taken', { jobId });
    }

    res.json({
      message: 'Job accepted by group',
      job: updatedJob,
    });
  } catch (error) {
    console.error('💥 Accept Group Job Error:', error);
    next(error);
  }
};

// GET /api/groups/my-member-groups - Get all groups where the current user is a member (not leader)
const getMyMemberGroups = async (req, res, next) => {
  try {
    const workerId = req.user.id;

    const memberships = await prisma.groupMember.findMany({
      where: { workerId, status: 'joined' },   // ← only groups where the worker accepted
      include: {
        group: {
          include: {
            leader: { select: { id: true, name: true, phone: true } },
            members: {
              include: {
                worker: { select: { id: true, name: true, phone: true } },
              },
            },
          },
        },
      },
    });

    const groups = memberships.map((m) => m.group);
    res.json({ groups });
  } catch (error) {
    console.error('💥 Get My Member Groups Error:', error);
    next(error);
  }
};

// POST /api/groups/:groupId/members - Send group invite (sets status='pending')
const addMember = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { workerId, name, role } = req.body;

    console.log('➕ Invite Member:', { groupId, workerId, name, role });

    if (!workerId) {
      return res.status(400).json({ error: 'Worker ID is required' });
    }

    // Verify group exists and caller is the leader
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { leader: { select: { id: true, name: true } } },
    });
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

    // Check if worker is already in ANY group (joined status)
    const alreadyInGroup = await prisma.groupMember.findFirst({
      where: { workerId, status: 'joined' },
    });
    if (alreadyInGroup) {
      return res.status(400).json({ error: 'Worker is already in another group' });
    }

    // Check if already invited/member of this group
    const existing = await prisma.groupMember.findFirst({
      where: { groupId, workerId },
    });

    let member;
    if (existing) {
      if (existing.status === 'joined') {
        return res.status(400).json({ error: 'Worker is already a member of this group' });
      }
      // Status is 'pending' — just resend the socket notification, don't create a duplicate
      member = existing;
      console.log('🔁 Re-sending invite for existing pending record:', member.id);
    } else {
      // Create new invite with pending status
      member = await prisma.groupMember.create({
        data: {
          groupId,
          workerId,
          name: name || worker.name,
          role: role || 'Member',
          status: 'pending',
        },
      });
      console.log('📨 Invite sent:', member.id);
    }

    // Emit socket invite to the worker's personal room
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${workerId}`).emit('group:invite', {
        groupId,
        groupName: group.name,
        leaderName: group.leader?.name || 'Group Leader',
        inviteId: member.id,
      });
      console.log(`📡 group:invite → worker user:${workerId}`);
    }

    res.status(201).json({
      message: 'Invite sent to worker',
      member,
    });
  } catch (error) {
    console.error('💥 Invite Member Error:', error);
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
        status: 'joined',
      },
    });

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

// DELETE /api/groups/:groupId - Leader deletes the entire group
const deleteGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.leaderId !== req.user.id)
      return res.status(403).json({ error: 'Only the group leader can delete this group' });

    // Delete in dependency order to avoid FK constraint violations
    await prisma.groupMessage.deleteMany({ where: { groupId } });
    await prisma.jobApplication.deleteMany({ where: { groupId } });
    await prisma.groupMember.deleteMany({ where: { groupId } });
    await prisma.group.delete({ where: { id: groupId } });

    console.log('🗑️ Group deleted:', groupId);
    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('💥 Delete Group Error:', error);
    next(error);
  }
};

// POST /api/groups/:groupId/members/:memberId/respond - Worker accepts or rejects invite
const respondToGroupInvite = async (req, res, next) => {
  try {
    const { groupId, memberId } = req.params;
    const { response } = req.body; // 'accept' | 'reject'
    const workerId = req.user.id;

    if (!['accept', 'reject'].includes(response)) {
      return res.status(400).json({ error: "response must be 'accept' or 'reject'" });
    }

    // Find the pending invite
    const invite = await prisma.groupMember.findUnique({ where: { id: memberId } });
    if (!invite) return res.status(404).json({ error: 'Invite not found' });
    if (invite.workerId !== workerId)
      return res.status(403).json({ error: 'This invite is not for you' });
    if (invite.status !== 'pending')
      return res.status(400).json({ error: 'Invite already responded to' });

    if (response === 'accept') {
      await prisma.groupMember.update({
        where: { id: memberId },
        data: { status: 'joined' },
      });

      // Notify the leader that the worker accepted
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        select: { leaderId: true, name: true },
      });
      const worker = await prisma.user.findUnique({
        where: { id: workerId },
        select: { name: true },
      });
      const io = req.app.get('io');
      if (io && group?.leaderId) {
        io.to(`user:${group.leaderId}`).emit('group:member_joined', {
          groupId,
          groupName: group.name,
          workerName: worker?.name || 'A worker',
          workerId,
        });
      }

      res.json({ message: 'You have joined the group', status: 'joined' });
    } else {
      // Reject — remove the invite record
      await prisma.groupMember.delete({ where: { id: memberId } });
      res.json({ message: 'Invite declined', status: 'rejected' });
    }
  } catch (error) {
    console.error('💥 Respond to Invite Error:', error);
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
  getMyMemberGroups,
  createGroup,
  getGroupDetails,
  getGroupJobs,
  acceptGroupJob,
  addMember,
  addMemberByPhone,
  updateMember,
  removeMember,
  updateGroupStatus,
  deleteGroup,
  respondToGroupInvite,
};
