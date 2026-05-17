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

// ── Production override ─────────────────────────────────────────────────────
// Set EXPO_PUBLIC_API_URL in your .env or EAS environment to use a real server.
// e.g. EXPO_PUBLIC_API_URL=https://api.myapp.com
const PRODUCTION_API_URL = process.env.EXPO_PUBLIC_API_URL || null;

// ── Dev: auto-detect host from Expo manifest ────────────────────────────────
const getDevHost = () => {
  // Expo Go: debuggerHost is like "192.168.1.x:8081" — strip the port
  const debuggerHost =
    Constants.expoConfig?.hostUri ||           // SDK 46+
    Constants.manifest2?.extra?.expoGo?.debuggerHost || // older SDK
    Constants.manifest?.debuggerHost;          // legacy

  if (debuggerHost) {
    // Strip port to get the bare IP/hostname
    return debuggerHost.split(':')[0];
  }

  // Android emulator: 10.0.2.2 always points to the host machine
  if (Platform.OS === 'android') return '10.0.2.2';

  // iOS simulator: localhost works
  return 'localhost';
};

const getApiUrl = () => {
  if (Platform.OS === 'web') return 'http://localhost:5000/api';
  if (PRODUCTION_API_URL) return `${PRODUCTION_API_URL}/api`;
  const host = getDevHost();
  return `http://${host}:5000/api`;
};

const getSocketUrl = () => {
  if (Platform.OS === 'web') return 'http://localhost:5000';
  if (PRODUCTION_API_URL) return PRODUCTION_API_URL;
  const host = getDevHost();
  return `http://${host}:5000`;
};

export const API_BASE_URL = getApiUrl();
export const SOCKET_BASE_URL = getSocketUrl();
export default API_BASE_URL;

export const API_CONFIG_INFO = {
  platform: Platform.OS,
  apiUrl: API_BASE_URL,
  socketUrl: SOCKET_BASE_URL,
};

console.log('🌐 API Configuration:', API_CONFIG_INFO);
