import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, setAuthToken } from '../services/api';

const STORAGE_KEY = 'edhigo_auth';

// ── Helpers: manual read/write to AsyncStorage ──
const saveToStorage = async (data) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (_) { }
};

const clearStorage = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (_) { }
};

// Called once on app start (from AppNavigator) to rehydrate state
export const loadAuthFromStorage = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
};

// Maps raw DB field names to the aliases FarmerProfileScreen reads:
//   skills  → crops     (crops grown)
//   status  → equipment (farm equipment — stored in status field temporarily)
const mapServerUser = (user) => {
  if (!user) return user;
  return {
    ...user,
    crops: user.crops ?? user.skills ?? null,
    equipment: user.equipment ?? user.status ?? null,
  };
};

const useAuthStore = create((set, get) => ({
  // ── State ──
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  language: 'te',
  otp: null,
  phone: null,
  _hydrated: false,

  // ── Rehydrate from AsyncStorage (called once on startup) ──
  rehydrate: async () => {
    const saved = await loadAuthFromStorage();
    if (saved) {
      if (saved.accessToken) setAuthToken(saved.accessToken);
      const user = mapServerUser(saved.user);
      set({
        user: user ?? null,
        accessToken: saved.accessToken ?? null,
        refreshToken: saved.refreshToken ?? null,
        isAuthenticated: saved.isAuthenticated ?? false,
        language: saved.language ?? 'te',
        phone: saved.phone ?? null,
        _hydrated: true,
      });
    } else {
      set({ _hydrated: true });
    }
  },

  // ── Actions ──
  setLanguage: (language) => {
    set({ language });
    const s = get();
    saveToStorage({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken, isAuthenticated: s.isAuthenticated, language, phone: s.phone });
  },

  updateUser: (userData) => {
    set((state) => {
      const updatedUser = { ...state.user, ...userData };
      saveToStorage({ user: updatedUser, accessToken: state.accessToken, refreshToken: state.refreshToken, isAuthenticated: state.isAuthenticated, language: state.language, phone: state.phone });
      return { user: updatedUser };
    });
  },

  sendOTP: async (phone) => {
    set({ isLoading: true });
    try {
      const response = await authAPI.sendOTP(phone);
      set({ phone, otp: response.data.otp, isLoading: false });
      return response.data;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  verifyOTP: async (phone, otp, registrationData = {}) => {
    set({ isLoading: true });
    try {
      const response = await authAPI.verifyOTP(phone, otp, registrationData);
      const { user, accessToken, refreshToken } = response.data;

      setAuthToken(accessToken);

      // Persist to AsyncStorage
      const mappedUser = mapServerUser(user);
      set({ user: mappedUser, accessToken, refreshToken, isAuthenticated: true, isLoading: false, otp: null });
      saveToStorage({ user: mappedUser, accessToken, refreshToken, isAuthenticated: true, language: get().language, phone });

      // Sync full profile from server in background
      try {
        const meResponse = await authAPI.getMe();
        if (meResponse?.data?.user) {
          const fullUser = mapServerUser({ ...user, ...meResponse.data.user });
          set({ user: fullUser });
          saveToStorage({ user: fullUser, accessToken, refreshToken, isAuthenticated: true, language: get().language, phone });
        }
      } catch (_) { }

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
      const updatedUser = response.data.user;
      set({ user: updatedUser, isLoading: false });
      const s = get();
      saveToStorage({ user: updatedUser, accessToken: s.accessToken, refreshToken: s.refreshToken, isAuthenticated: s.isAuthenticated, language: s.language, phone: s.phone });
      return response.data;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    setAuthToken(null);
    clearStorage();
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, otp: null, phone: null });
  },
}));

export default useAuthStore;
