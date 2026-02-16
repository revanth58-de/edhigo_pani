// Group Service - uses shared apiClient for correct base URL and auth
import { groupAPI } from '../api';

export const groupService = {
  // Create a group
  createGroup: async (data) => {
    try {
      const response = await groupAPI.createGroup({
        leaderId: data.leaderId,
        name: data.name,
        memberCount: data.memberCount,
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Create Group Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create group',
      };
    }
  },

  // Get group jobs
  getGroupJobs: async (groupId) => {
    try {
      const response = await groupAPI.getGroupJobs(groupId);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Get Group Jobs Error:', error);
      return { success: false, data: [] };
    }
  },

  // Accept group job
  acceptGroupJob: async (data) => {
    try {
      const response = await groupAPI.acceptGroupJob({
        groupId: data.groupId,
        jobId: data.jobId,
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Accept Group Job Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to accept job',
      };
    }
  },

  // Get group details
  getGroupDetails: async (groupId) => {
    try {
      const response = await groupAPI.getGroupDetails(groupId);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Get Group Details Error:', error);
      return { success: false, data: null };
    }
  },

  // Add member to group
  addMember: async (data) => {
    try {
      const response = await groupAPI.addMember(data.groupId, data.workerId);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Add Member Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to add member',
      };
    }
  },
};
