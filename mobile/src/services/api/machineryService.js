// Machinery Service - wraps machinery API calls
import { machineryAPI } from '../api';

export const machineryService = {
  register: async (machineryData) => {
    try {
      const response = await machineryAPI.register(machineryData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Register Machinery Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to register machinery',
      };
    }
  },

  getMachineryListings: async (params) => {
    try {
      const response = await machineryAPI.getListings(params);
      return { success: true, listings: response.data.listings || [] };
    } catch (error) {
      console.error('Get Machinery Listings Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch machinery listings',
        listings: [],
      };
    }
  },

  bookMachinery: async (bookingData) => {
    try {
      const response = await machineryAPI.bookMachinery(bookingData);
      return { success: true, booking: response.data.booking };
    } catch (error) {
      console.error('Book Machinery Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to book machinery',
      };
    }
  },

  getBookings: async () => {
    try {
      const response = await machineryAPI.getBookings();
      return { success: true, bookings: response.data.bookings || [] };
    } catch (error) {
      console.error('Get Bookings Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch bookings',
        bookings: [],
      };
    }
  },

  getOwnerListings: async () => {
    try {
      const response = await machineryAPI.getOwnerListings();
      return { success: true, listings: response.data.listings || [] };
    } catch (error) {
      console.error('Get Owner Listings Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch owner listings',
        listings: [],
      };
    }
  },

  getOwnerBookings: async () => {
    try {
      const response = await machineryAPI.getOwnerBookings();
      return { success: true, bookings: response.data.bookings || [] };
    } catch (error) {
      console.error('Get Owner Bookings Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch owner bookings',
        bookings: [],
      };
    }
  },
  updateBookingStatus: async (bookingId, status) => {
    try {
      const response = await machineryAPI.updateBookingStatus(bookingId, status);
      return { success: true, booking: response.data.booking };
    } catch (error) {
      console.error('Update Booking Status Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update booking status',
      };
    }
  },
};
