/**
 * API Configuration
 * Auto-detects the backend IP from Expo's dev server manifest.
 * This means you NEVER need to update a hardcoded IP again.
 *
 * How it works:
 *   - In Expo Go (dev): reads the host from the Metro bundler URL
 *     e.g. exp://192.168.1.x:8081 → backend = http://192.168.1.x:5000
 *   - In production build: reads EXPO_PUBLIC_API_URL env var
 *   - On web: always localhost
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ── Cloud backend ────────────────────────────────────────────────────────────
// Default target: live Render cloud backend
const DEFAULT_CLOUD_BACKEND = 'https://edhigo-pani.onrender.com';
const PRODUCTION_API_URL = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_CLOUD_BACKEND).replace(/\/$/, '');

// Only use local IP if EXPO_PUBLIC_USE_LOCAL_BACKEND=true is explicitly set
const USE_LOCAL_BACKEND = process.env.EXPO_PUBLIC_USE_LOCAL_BACKEND === 'true';

// ── Dev host detection (only active when USE_LOCAL_BACKEND=true) ──────────────
const getDevHost = () => {
  const debuggerHost =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost;

  if (debuggerHost) {
    return debuggerHost.split(':')[0];
  }

  if (Platform.OS === 'android') return '10.0.2.2';
  return 'localhost';
};

const getApiUrl = () => {
  if (USE_LOCAL_BACKEND && __DEV__) {
    const host = getDevHost();
    if (host) return `http://${host}:5000/api`;
  }
  return `${PRODUCTION_API_URL}/api`;
};

const getSocketUrl = () => {
  if (USE_LOCAL_BACKEND && __DEV__) {
    const host = getDevHost();
    if (host) return `http://${host}:5000`;
  }
  return PRODUCTION_API_URL;
};

export const API_BASE_URL = getApiUrl();
export const SOCKET_BASE_URL = getSocketUrl();
export default API_BASE_URL;

export const API_CONFIG_INFO = {
  platform: Platform.OS,
  apiUrl: API_BASE_URL,
  socketUrl: SOCKET_BASE_URL,
  liveCloud: !USE_LOCAL_BACKEND,
};

console.log('🌐 DINASARI API Target:', API_CONFIG_INFO);
