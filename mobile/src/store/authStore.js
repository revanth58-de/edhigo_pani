import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { authAPI, setAuthToken } from '../services/api';
import { identifySentryUser, clearSentryUser } from '../config/sentry';

const STORAGE_KEY = 'edhigo_auth_meta';
const ACCESS_TOKEN_KEY = 'edhigo_access_token';
const REFRESH_TOKEN_KEY = 'edhigo_refresh_token';

// ── SecureStorage shim ──────────────────────────────────────────────────────
// expo-secure-store requires a native build (custom dev client / standalone).
// In Expo Go the native module is not bridged, so setValueWithKeyAsync throws.
// This shim checks availability first and falls back to AsyncStorage, ensuring
// the auth flow works in both Expo Go (dev) and production builds.
const SecureStorage = {
  async set(key, value) {
    try {
      const available = await SecureStore.isAvailableAsync();
      if (available) {
        await SecureStore.setItemAsync(key, value);
      } else {
        await AsyncStorage.setItem(key, value);
      }
    } catch (err) {
      // Last-resort fallback — never crash the auth flow
      console.warn(`SecureStorage.set fallback for ${key}:`, err.message);
      await AsyncStorage.setItem(key, value);
    }
  },
  async get(key) {
    try {
      const available = await SecureStore.isAvailableAsync();
      if (available) {
        return await SecureStore.getItemAsync(key);
      }
      return await AsyncStorage.getItem(key);
    } catch (err) {
      console.warn(`SecureStorage.get fallback for ${key}:`, err.message);
      return await AsyncStorage.getItem(key);
    }
  },
  async remove(key) {
    try {
      const available = await SecureStore.isAvailableAsync();
      if (available) {
        await SecureStore.deleteItemAsync(key);
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (err) {
      console.warn(`SecureStorage.remove fallback for ${key}:`, err.message);
      await AsyncStorage.removeItem(key);
    }
  },
};

// ── Helpers: Secure & Regular Storage ──
const saveToStorage = async (data) => {
  try {
    const { accessToken, refreshToken, user, isAuthenticated, language, phone, cameraPermission } = data;
    const meta = { user, isAuthenticated, language, phone, cameraPermission };

    // Save non-sensitive meta to AsyncStorage
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(meta));

    // Save sensitive tokens via shim (SecureStore w/ AsyncStorage fallback)
    if (accessToken) await SecureStorage.set(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) await SecureStorage.set(REFRESH_TOKEN_KEY, refreshToken);
  } catch (error) {
    console.error('Error saving auth to storage:', error);
  }
};

const clearStorage = async () => {
  try {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEY),
      SecureStorage.remove(ACCESS_TOKEN_KEY),
      SecureStorage.remove(REFRESH_TOKEN_KEY),
    ]);
  } catch (_) { }
};

// Called once on app start (from AppNavigator) to rehydrate state
export const loadAuthFromStorage = async () => {
  try {
    const [rawMeta, accessToken, refreshToken] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      SecureStorage.get(ACCESS_TOKEN_KEY),
      SecureStorage.get(REFRESH_TOKEN_KEY),
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
  cameraPermission: null, // 'granted' | 'denied' | null
  _hydrated: false,
  lastOTPRequestTime: null, // Timestamp of last OTP request
  otpCooldownSeconds: 0, // Remaining cooldown in seconds

  // ── Rehydrate from AsyncStorage (called once on startup) ──
  rehydrate: async () => {
    const saved = await loadAuthFromStorage();
    if (saved) {
      // Guard: meta says "authenticated" but no token was actually persisted
      // (e.g. SecureStore crashed on a previous session). Force clean logout
      // so the user is sent to login instead of being stuck in a 401 loop.
      if (saved.isAuthenticated && !saved.accessToken) {
        await clearStorage();
        set({ _hydrated: true, isAuthenticated: false });
        return;
      }

      if (saved.accessToken) setAuthToken(saved.accessToken);
      const mappedUser = mapServerUser(saved.user);
      set({
        user: mappedUser ?? null,
        accessToken: saved.accessToken ?? null,
        refreshToken: saved.refreshToken ?? null,
        isAuthenticated: saved.isAuthenticated ?? false,
        language: saved.language ?? 'te',
        phone: saved.phone ?? null,
        cameraPermission: saved.cameraPermission ?? null,
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
    await saveToStorage(get());
  },

  setCameraPermission: async (status) => {
    set({ cameraPermission: status });
    await saveToStorage(get());
  },

  updateUser: async (userData) => {
    const state = get();
    const updatedUser = { ...state.user, ...userData };
    set({ user: updatedUser });
    await saveToStorage(get());
  },

  refreshProfile: async () => {
    try {
      const meResponse = await authAPI.getMe();
      if (meResponse?.data?.user) {
        const state = get();
        const fullUser = mapServerUser({ ...state.user, ...meResponse.data.user });
        set({ user: fullUser });
        await saveToStorage(get());
      }
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
  },

  sendOTP: async (phone) => {
    const state = get();
    const now = Date.now();
    const cooldownDuration = 60000; // 60 seconds in milliseconds

    // Check if user is still in cooldown period (skip in development or if bypassed via env)
    const bypassCooldown = (typeof __DEV__ !== 'undefined' && __DEV__) || process.env.EXPO_PUBLIC_BYPASS_OTP_COOLDOWN === 'true';
    if (state.lastOTPRequestTime && !bypassCooldown) {
      const timeSinceLastRequest = now - state.lastOTPRequestTime;
      if (timeSinceLastRequest < cooldownDuration) {
        const remainingSeconds = Math.ceil((cooldownDuration - timeSinceLastRequest) / 1000);
        const error = new Error(`Please wait ${remainingSeconds} seconds before requesting another OTP`);
        error.code = 'RATE_LIMIT_COOLDOWN';
        error.remainingSeconds = remainingSeconds;
        throw error;
      }
    }

    set({ isLoading: true });
    try {
      const response = await authAPI.sendOTP(phone);
      // NOTE: OTP is NOT stored in state for security — it goes via SMS only
      set({ 
        phone, 
        isLoading: false, 
        lastOTPRequestTime: now,
        otpCooldownSeconds: 0 
      });
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
      
      await saveToStorage(get());

      // Connect socket after auth + identify user in Sentry for crash correlation
      import('../services/socketService').then(s => s.socketService.connect());
      identifySentryUser(mappedUser?.id, mappedUser?.role);

      // Sync full profile from server in background
      try {
        const meResponse = await authAPI.getMe();
        if (meResponse?.data?.user) {
          const fullUser = mapServerUser({ ...user, ...meResponse.data.user });
          set({ user: fullUser });
          await saveToStorage(get());
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
      await saveToStorage(get());
      return response.data;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    setAuthToken(null);
    clearStorage();
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, phone: null, cameraPermission: null, _hydrated: true });
    import('../services/socketService').then(s => s.socketService.disconnect());
    clearSentryUser(); // Remove user context from Sentry on logout
  },
}));

export default useAuthStore;
