// Payment Service - uses shared apiClient for correct base URL and auth
import { paymentAPI } from '../api';

export const paymentService = {
  // Make a payment
  makePayment: async (data) => {
    try {
      const response = await paymentAPI.makePayment({
        jobId: data.jobId,
        amount: data.amount,
        method: data.method, // 'cash' or 'upi'
        transactionId: data.transactionId,
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Payment Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Payment failed',
      };
    }
  },

  // Get payment history
  getPaymentHistory: async (userId) => {
    try {
      const response = await paymentAPI.getHistory(userId);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Get Payment History Error:', error);
      return { success: false, data: [] };
    }
  },

  // Get payment details
  getPaymentDetails: async (paymentId) => {
    try {
      const response = await paymentAPI.getDetails(paymentId);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Get Payment Details Error:', error);
      return { success: false, data: null };
    }
  },
};
