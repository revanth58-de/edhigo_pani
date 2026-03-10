const prisma = require('../config/database');

// GET /api/chats/:groupId/messages
const getGroupMessages = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id; // leader or member

    // Basic verification: user is leader or member
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const isLeader = group.leaderId === userId;
    const isMember = group.members.some(m => m.workerId === userId);

    if (!isLeader && !isMember) {
      return res.status(403).json({ error: 'Not authorized to view this chat' });
    }

    const messages = await prisma.groupMessage.findMany({
      where: { groupId },
      include: {
        sender: {
          select: { id: true, name: true, photoUrl: true, role: true }
        }
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ messages });
  } catch (error) {
    console.error('💥 Get Chat Messages Error:', error);
    next(error);
  }
};

module.exports = {
  getGroupMessages,
};
