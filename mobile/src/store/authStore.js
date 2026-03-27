import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { authAPI, setAuthToken } from '../services/api';

const STORAGE_KEY = 'edhigo_auth_meta';
const ACCESS_TOKEN_KEY = 'edhigo_access_token';
const REFRESH_TOKEN_KEY = 'edhigo_refresh_token';

// ── Helpers: Secure & Regular Storage ──
const saveToStorage = async (data) => {
  try {
    const { accessToken, refreshToken, ...meta } = data;
    
    // Save non-sensitive meta to AsyncStorage
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
    
    // Save sensitive tokens to SecureStore
    if (accessToken) await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  } catch (error) {
    console.error('Error saving auth to storage:', error);
  }
};

const clearStorage = async () => {
  try {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEY),
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
  } catch (_) { }
};

// Called once on app start (from AppNavigator) to rehydrate state
export const loadAuthFromStorage = async () => {
  try {
    const [rawMeta, accessToken, refreshToken] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    ]);

    const meta = rawMeta ? JSON.parse(rawMeta) : {};
    return {
      ...meta,
      accessToken,
      refreshToken,
    };
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
      const mappedUser = mapServerUser(saved.user);
      set({
        user: mappedUser ?? null,
        accessToken: saved.accessToken ?? null,
        refreshToken: saved.refreshToken ?? null,
        isAuthenticated: saved.isAuthenticated ?? false,
        language: saved.language ?? 'te',
        phone: saved.phone ?? null,
        _hydrated: true,
      });

      if (saved.isAuthenticated) {
        import('../services/socketService').then(s => s.socketService.connect());
      }
    } else {
      set({ _hydrated: true });
    }
  },

  // ── Actions ──
  setLanguage: async (language) => {
    set({ language });
    const s = get();
    await saveToStorage({ 
      user: s.user, 
      accessToken: s.accessToken, 
      refreshToken: s.refreshToken, 
      isAuthenticated: s.isAuthenticated, 
      language, 
      phone: s.phone 
    });
  },

  updateUser: async (userData) => {
    const state = get();
    const updatedUser = { ...state.user, ...userData };
    set({ user: updatedUser });
    await saveToStorage({ 
      user: updatedUser, 
      accessToken: state.accessToken, 
      refreshToken: state.refreshToken, 
      isAuthenticated: state.isAuthenticated, 
      language: state.language, 
      phone: state.phone 
    });
  },

  refreshProfile: async () => {
    try {
      const meResponse = await authAPI.getMe();
      if (meResponse?.data?.user) {
        set((state) => {
          // Merge to avoid losing state properties not returned by getMe
          const fullUser = mapServerUser({ ...state.user, ...meResponse.data.user });
          saveToStorage({ user: fullUser, accessToken: state.accessToken, refreshToken: state.refreshToken, isAuthenticated: state.isAuthenticated, language: state.language, phone: state.phone });
          return { user: fullUser };
        });
      }
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
  },

  sendOTP: async (phone) => {
    set({ isLoading: true });
    try {
      const response = await authAPI.sendOTP(phone);
      // NOTE: OTP is NOT stored in state for security — it goes via SMS only
      set({ phone, isLoading: false });
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

      // Persist to Storage
      const mappedUser = mapServerUser(user);
      set({ user: mappedUser, accessToken, refreshToken, isAuthenticated: true, isLoading: false, otp: null });
      
      await saveToStorage({ 
        user: mappedUser, 
        accessToken, 
        refreshToken, 
        isAuthenticated: true, 
        language: get().language, 
        phone 
      });

      // Connect socket after auth
      import('../services/socketService').then(s => s.socketService.connect());

      // Sync full profile from server in background
      try {
        const meResponse = await authAPI.getMe();
        if (meResponse?.data?.user) {
          const fullUser = mapServerUser({ ...user, ...meResponse.data.user });
          set({ user: fullUser });
          await saveToStorage({ 
            user: fullUser, 
            accessToken, 
            refreshToken, 
            isAuthenticated: true, 
            language: get().language, 
            phone 
          });
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
      await saveToStorage({ 
        user: updatedUser, 
        accessToken: s.accessToken, 
        refreshToken: s.refreshToken, 
        isAuthenticated: s.isAuthenticated, 
        language: s.language, 
        phone: s.phone 
      });
      return response.data;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    setAuthToken(null);
    clearStorage();
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, phone: null, _hydrated: true });
    import('../services/socketService').then(s => s.socketService.disconnect());
  },
}));

export default useAuthStore;
