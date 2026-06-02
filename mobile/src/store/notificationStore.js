// Global notification store — collects all in-app events so users never miss anything
import { create } from 'zustand';

// Helper to infer the category of notification from its content
const getNotificationType = (item) => {
  const title = (item.title || '').toLowerCase();
  const body = (item.body || '').toLowerCase();
  const data = item.data || {};
  const screen = (data.screen || '').toLowerCase();

  if (screen.includes('machinery') || title.includes('machinery') || title.includes('booking') || body.includes('booked')) {
    return 'machinery';
  }
  if (screen.includes('payment') || title.includes('payment') || body.includes('paid') || title.includes('earning')) {
    return 'payment';
  }
  if (screen.includes('attendance') || title.includes('attendance') || body.includes('arrived') || body.includes('finished') || body.includes('check-in') || body.includes('check-out') || title.includes('arrived') || title.includes('finished') || title.includes('arriving')) {
    return 'attendance';
  }
  if (screen.includes('group') || title.includes('group') || body.includes('group') || body.includes('invited')) {
    return 'group';
  }
  if (screen.includes('job') || title.includes('job') || body.includes('job') || screen.includes('offer')) {
    return 'job';
  }
  return 'info';
};

const TYPE_ICONS = {
  job: 'work',
  group: 'groups',
  payment: 'currency-rupee',
  attendance: 'fact-check',
  machinery: 'agriculture',
  info: 'info-outline',
};

const useNotificationStore = create((set, get) => ({
  notifications: [],

  // Add a notification (deduplicates by id)
  addNotification: (notification) => {
    const inferredType = notification.type || getNotificationType(notification);
    const n = {
      id: notification.id || `n-${Date.now()}-${Math.random()}`,
      type: inferredType,
      title: notification.title || 'Notification',
      body: notification.body || '',
      icon: notification.icon || TYPE_ICONS[inferredType] || 'notifications',
      read: notification.read !== undefined ? notification.read : false,
      timestamp: notification.timestamp || new Date().toISOString(),
      data: notification.data || null,       // raw payload for deep-link navigation
    };
    set((state) => {
      // Deduplicate by id — same notification arriving twice won't double-push
      if (state.notifications.find((x) => x.id === n.id)) return state;
      return { notifications: [n, ...state.notifications].slice(0, 100) };
    });
  },

  fetchNotifications: async () => {
    try {
      const { notificationService } = require('../services/api/notificationService');
      const res = await notificationService.getNotifications(0, 50);
      if (res.success && res.data?.notifications) {
        const list = res.data.notifications.map((n) => {
          const inferredType = getNotificationType(n);
          return {
            id: n.id,
            type: inferredType,
            title: n.title,
            body: n.body,
            icon: TYPE_ICONS[inferredType] || 'notifications',
            read: n.isRead,
            timestamp: n.createdAt,
            data: n.data,
          };
        });
        set({ notifications: list });
      }
    } catch (err) {
      console.warn('Store fetchNotifications error:', err.message);
    }
  },

  markRead: async (id, skipApi = false) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));

    if (skipApi) return;

    try {
      const { notificationService } = require('../services/api/notificationService');
      await notificationService.markAsRead(id);
    } catch (err) {
      console.warn('Store markRead error:', err.message);
    }
  },

  markAllRead: async (skipApi = false) => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));

    if (skipApi) return;

    try {
      const { notificationService } = require('../services/api/notificationService');
      await notificationService.markAllAsRead();
    } catch (err) {
      console.warn('Store markAllRead error:', err.message);
    }
  },

  clearAll: async (skipApi = false) => {
    set({ notifications: [] });

    if (skipApi) return;

    try {
      const { notificationService } = require('../services/api/notificationService');
      await notificationService.clearNotifications();
    } catch (err) {
      console.warn('Store clearAll error:', err.message);
    }
  },
}));

export default useNotificationStore;

