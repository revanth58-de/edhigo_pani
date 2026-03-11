// Rating Service - uses shared apiClient for correct base URL and auth
import { ratingAPI } from '../api';

// Convert star rating (1-5) to emoji string the backend expects
const starsToEmoji = (stars) => {
  if (stars >= 4) return 'happy';
  if (stars === 3) return 'neutral';
  return 'sad';
};

export const ratingService = {
  // Rate a worker (farmer rates worker)
  rateWorker: async (data) => {
    try {
      const response = await ratingAPI.rateWorker({
        jobId: data.jobId,
        toUserId: data.workerId,        // backend uses toUserId
        stars: data.rating,             // backend uses stars
        emoji: starsToEmoji(data.rating), // backend requires emoji
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Rate Worker Error:', error);
      return {
        success: false,
        message: error.response?.data?.error || error.response?.data?.message || 'Failed to rate worker',
      };
    }
  },

  // Rate a farmer (worker rates farmer)
  rateFarmer: async (data) => {
    try {
      const response = await ratingAPI.rateFarmer({
        jobId: data.jobId,
        toUserId: data.farmerId,        // backend uses toUserId
        stars: data.rating,             // backend uses stars
        emoji: starsToEmoji(data.rating), // backend requires emoji
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Rate Farmer Error:', error);
      return {
        success: false,
        message: error.response?.data?.error || error.response?.data?.message || 'Failed to rate farmer',
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
