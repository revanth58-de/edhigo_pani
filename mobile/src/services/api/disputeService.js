import { disputeAPI } from '../api';

export const disputeService = {
  fileDispute: async (data) => {
    try {
      const response = await disputeAPI.fileDispute({
        jobId: data.jobId,
        paymentId: data.paymentId,
        category: data.category,
        description: data.description,
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('File Dispute Error:', error);
      return {
        success: false,
        message: error.response?.data?.error || error.response?.data?.message || 'Failed to file dispute',
      };
    }
  },

  getMyDisputes: async () => {
    try {
      const response = await disputeAPI.getMyDisputes();
      return { success: true, data: response.data?.disputes || [] };
    } catch (error) {
      console.error('Get My Disputes Error:', error);
      return { success: false, data: [] };
    }
  },

  getJobDisputes: async (jobId) => {
    try {
      const response = await disputeAPI.getJobDisputes(jobId);
      return { success: true, data: response.data?.disputes || [] };
    } catch (error) {
      console.error('Get Job Disputes Error:', error);
      return { success: false, data: [] };
    }
  },
};
