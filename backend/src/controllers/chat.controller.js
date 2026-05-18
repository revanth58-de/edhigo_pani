const prisma = require('../config/database');
const { logger } = require('../middleware/errorHandler');

// GET /api/chats/:groupId/messages
// B2: Cursor-based pagination — avoids loading all 200+ messages on mount.
// Mobile client sends ?before=<messageId> to fetch the 50 messages preceding that ID.
// On first load (no cursor), returns the 50 most recent messages.
// Client prepends older pages as user scrolls up, keeping memory pressure low.
const PAGE_SIZE = 50;

const getGroupMessages = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { before } = req.query; // cursor: load messages before this message ID
    const userId = req.user.id;

    // Authorization: user must be leader or member of this group
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: { select: { workerId: true } } },
    });

    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    const isLeader = group.leaderId === userId;
    const isMember = group.members.some(m => m.workerId === userId);

    if (!isLeader && !isMember) {
      return res.status(403).json({ success: false, error: 'Not authorized to view this chat' });
    }

    // B2: Build cursor clause — if `before` is given, fetch messages with a
    // createdAt strictly earlier than the referenced message's timestamp.
    // This is more stable than offset-based pagination (avoids duplicates on
    // concurrent inserts shifting rows during scroll).
    let cursorFilter = {};
    if (before) {
      const pivot = await prisma.groupMessage.findUnique({
        where: { id: before },
        select: { createdAt: true },
      });
      if (pivot) {
        cursorFilter = { createdAt: { lt: pivot.createdAt } };
      }
    }

    const messages = await prisma.groupMessage.findMany({
      where: { groupId, ...cursorFilter },
      include: {
        sender: {
          select: { id: true, name: true, photoUrl: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' }, // fetch newest first, reverse on client
      take: PAGE_SIZE,
    });

    // Return in chronological order (oldest → newest) for the client to render top→bottom
    const ordered = messages.reverse();

    // Provide a cursor the client can use to fetch the next older page
    const nextCursor = ordered.length === PAGE_SIZE ? ordered[0].id : null;

    res.json({
      success: true,
      data: ordered,
      meta: {
        count: ordered.length,
        nextCursor,   // pass as ?before=<nextCursor> to load older messages
        hasMore: nextCursor !== null,
      },
    });
  } catch (error) {
    logger.error('Get Chat Messages Error', { message: error.message });
    next(error);
  }
};

module.exports = {
  getGroupMessages,
};
