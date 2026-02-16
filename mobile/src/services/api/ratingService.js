// Rating Service - uses shared apiClient for correct base URL and auth
import { ratingAPI } from '../api';

export const ratingService = {
  // Rate a worker (farmer rates worker)
  rateWorker: async (data) => {
    try {
      const response = await ratingAPI.rateWorker({
        jobId: data.jobId,
        workerId: data.workerId,
        rating: data.rating,
        feedback: data.feedback,
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Rate Worker Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to rate worker',
      };
    }
  },

  // Rate a farmer (worker rates farmer)
  rateFarmer: async (data) => {
    try {
      const response = await ratingAPI.rateFarmer({
        jobId: data.jobId,
        rating: data.rating,
        feedback: data.feedback,
        isGroupRating: data.isGroupRating || false,
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Rate Farmer Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to rate farmer',
      };
    }
  },

  // Get ratings for a user
  getRatings: async (userId) => {
    try {
      const response = await ratingAPI.getRatings(userId);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Get Ratings Error:', error);
      return { success: false, data: [] };
    }
  },
};
