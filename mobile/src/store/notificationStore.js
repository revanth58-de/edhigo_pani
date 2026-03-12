// Global notification store — collects all in-app events so users never miss anything
import { create } from 'zustand';

const useNotificationStore = create((set, get) => ({
  notifications: [],

  // Add a notification (deduplicates by id)
  addNotification: (notification) => {
    const n = {
      id: notification.id || `n-${Date.now()}-${Math.random()}`,
      type: notification.type || 'info',     // 'job' | 'group' | 'payment' | 'attendance' | 'info'
      title: notification.title || 'Notification',
      body: notification.body || '',
      icon: notification.icon || 'notifications',
      read: false,
      timestamp: notification.timestamp || new Date().toISOString(),
      data: notification.data || null,       // raw payload for deep-link navigation
    };
    set((state) => {
      // Deduplicate by id — same notification arriving twice won't double-push
      if (state.notifications.find((x) => x.id === n.id)) return state;
      return { notifications: [n, ...state.notifications].slice(0, 100) };
    });
  },

  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),

  clearAll: () => set({ notifications: [] }),
}));

export default useNotificationStore;
