import { create } from 'zustand';
import { authAPI, setAuthToken } from '../services/api';

const useAuthStore = create((set, get) => ({
  // State
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  language: 'te', // Default Telugu
  otp: null,       // On-screen OTP
  phone: null,

  // Actions
  setLanguage: (language) => set({ language }),
  updateUser: (userData) => set((state) => ({ user: { ...state.user, ...userData } })),

  sendOTP: async (phone) => {
    set({ isLoading: true });
    try {
      const response = await authAPI.sendOTP(phone);
      set({
        phone,
        otp: response.data.otp, // On-screen OTP (no SMS cost)
        isLoading: false,
      });
      return response.data;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  verifyOTP: async (phone, otp) => {
    set({ isLoading: true });
    try {
      const response = await authAPI.verifyOTP(phone, otp);
      const { user, accessToken, refreshToken } = response.data;

      setAuthToken(accessToken);

      set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
        otp: null,
      });
      return response.data;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  setRole: async (role) => {
    set({ isLoading: true });
    try {
      const response = await authAPI.setRole(role);
      set({
        user: response.data.user,
        isLoading: false,
      });
      return response.data;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    setAuthToken(null);
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      otp: null,
      phone: null,
    });
  },
}));

export default useAuthStore;
