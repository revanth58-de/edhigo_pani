// Attendance Service - uses shared apiClient for correct base URL and auth
import { attendanceAPI } from '../api';

export const attendanceService = {
  // Check in (worker scans QR to check in)
  checkIn: async (data) => {
    try {
      const response = await attendanceAPI.checkIn({
        jobId: data.jobId,
        workerId: data.workerId,
        qrData: data.qrData,
        timestamp: data.timestamp || new Date().toISOString(),
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Check In Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Check-in failed',
      };
    }
  },

  // Check out (worker scans QR to check out)
  checkOut: async (data) => {
    try {
      const response = await attendanceAPI.checkOut({
        jobId: data.jobId,
        workerId: data.workerId,
        qrData: data.qrData,
        timestamp: data.timestamp || new Date().toISOString(),
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Check Out Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Check-out failed',
      };
    }
  },

  // Get attendance records
  getAttendanceRecords: async (jobId) => {
    try {
      const response = await attendanceAPI.getRecords(jobId);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Get Attendance Records Error:', error);
      return { success: false, data: [] };
    }
  },

  // Generate QR code data for farmer
  generateQRData: (jobId, type) => {
    return JSON.stringify({
      jobId,
      type, // 'in' or 'out'
      timestamp: Date.now(),
    });
  },
};
