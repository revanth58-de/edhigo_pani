// Auth Service - wraps the shared authAPI with error handling
import { authAPI, setAuthToken } from '../api';

export const authService = {
  sendOTP: async (phone) => {
    try {
      const response = await authAPI.sendOTP(phone);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Send OTP Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send OTP',
      };
    }
  },

  verifyOTP: async (phone, otp) => {
    try {
      const response = await authAPI.verifyOTP(phone, otp);
      if (response.data.token) {
        setAuthToken(response.data.token);
      }
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Verify OTP Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Invalid OTP',
      };
    }
  },

  setRole: async (role) => {
    try {
      const response = await authAPI.setRole(role);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Set Role Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to set role',
      };
    }
  },

  updateProfile: async (data) => {
    try {
      const response = await authAPI.updateProfile(data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Update Profile Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update profile',
      };
    }
  },

  getMe: async () => {
    try {
      const response = await authAPI.getMe();
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Get Me Error:', error);
      return { success: false, data: null };
    }
  },
};
