// Job Service - uses shared apiClient for auth token support
import { jobAPI } from '../api';

export const jobService = {
  // Create a new job posting
  createJob: async (jobData) => {
    try {
      const response = await jobAPI.createJob(jobData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Create Job Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create job',
      };
    }
  },

  // Get all jobs (with optional filters)
  getJobs: async (filters = {}) => {
    try {
      const response = await jobAPI.getJobs(filters);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Get Jobs Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch jobs',
      };
    }
  },

  // Get a specific job by ID
  getJob: async (jobId) => {
    try {
      const response = await jobAPI.getJob(jobId);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Get Job Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch job',
      };
    }
  },

  // Accept a job (worker/leader)
  acceptJob: async (jobId, workerId) => {
    try {
      const response = await jobAPI.acceptJob(jobId, workerId);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Accept Job Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to accept job',
      };
    }
  },

  // Update job status
  updateJobStatus: async (jobId, status) => {
    try {
      const response = await jobAPI.updateStatus(jobId, status);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Update Job Status Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update job status',
      };
    }
  },

  // Cancel a job
  cancelJob: async (jobId) => {
    try {
      const response = await jobAPI.cancelJob(jobId);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Cancel Job Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to cancel job',
      };
    }
  },
};
