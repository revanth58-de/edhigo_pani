const prisma = require('../config/database');
const { logger } = require('../middleware/errorHandler');

/**
 * Fetch all notifications for the authenticated user (paginated)
 * GET /api/notifications
 */
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    let [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.notification.count({ where: { userId } }),
    ]);

    // Auto-seed welcome notifications on first load if empty and offset is 0,
    // only in non-testing environments.
    if (total === 0 && offset === 0 && process.env.NODE_ENV !== 'test') {
      try {
        const welcomeNotifications = [
          {
            userId,
            title: '🌿 Welcome to Dinasari!',
            body: 'We are excited to have you join our network. You can now post jobs, find nearby agricultural work, and connect with local leaders.',
            data: { screen: 'WorkerHome' },
            isRead: false,
          },
          {
            userId,
            title: '🚜 Machinery Bookings',
            body: 'Need a tractor, thresher, or harvester? Browse listings and book machinery directly within the app.',
            data: { screen: 'WorkerMachinery' },
            isRead: false,
          }
        ];

        await prisma.notification.createMany({
          data: welcomeNotifications
        });

        // Refetch notifications and update total
        [notifications, total] = await Promise.all([
          prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
          }),
          prisma.notification.count({ where: { userId } }),
        ]);
      } catch (seedErr) {
        logger.error('Failed to seed welcome notifications', { message: seedErr.message });
      }
    }

    const unreadCount = await prisma.notification.count({ where: { userId, isRead: false } });

    res.json({
      success: true,
      notifications,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      unreadCount,
    });
  } catch (error) {
    logger.error('Get notifications error', { message: error.message });
    next(error);
  }
};

/**
 * Mark a single notification as read
 * PATCH /api/notifications/:id/read
 */
const markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (notification.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.json({
      success: true,
      notification: updated,
    });
  } catch (error) {
    logger.error('Mark notification as read error', { message: error.message });
    next(error);
  }
};

/**
 * Mark all notifications for the user as read
 * POST /api/notifications/read-all
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { count } = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    logger.error('Mark all notifications as read error', { message: error.message });
    next(error);
  }
};

/**
 * Delete all notifications for the user
 * DELETE /api/notifications
 */
const clearNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { count } = await prisma.notification.deleteMany({
      where: { userId },
    });

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    logger.error('Clear all notifications error', { message: error.message });
    next(error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  clearNotifications,
};

