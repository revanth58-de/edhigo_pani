// Notification Service - uses shared apiClient for correct base URL and auth
import { notificationAPI } from '../api';

export const notificationService = {
  // Fetch paginated notifications for the current user
  getNotifications: async (offset = 0, limit = 20) => {
    try {
      const response = await notificationAPI.getNotifications({ offset, limit });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Get Notifications Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch notifications',
        data: { notifications: [], pagination: { hasMore: false } }
      };
    }
  },

  // Mark a single notification as read
  markAsRead: async (id) => {
    try {
      const response = await notificationAPI.markAsRead(id);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Mark Notification Read Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to mark notification as read',
      };
    }
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    try {
      const response = await notificationAPI.markAllAsRead();
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Mark All Notifications Read Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to mark all as read',
      };
    }
  },

  // Clear all notifications
  clearNotifications: async () => {
    try {
      const response = await notificationAPI.clearNotifications();
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Clear All Notifications Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to clear all notifications',
      };
    }
  },
};
