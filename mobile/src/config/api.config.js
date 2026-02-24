/**
 * API Configuration
 * Central place to manage API URLs for different environments
 * Auto-detects platform so emulator + web work simultaneously
 */
import { Platform } from 'react-native';

// IMPORTANT: Update this IP address with your PC's local IP
// To find your IP: Run `ipconfig` in PowerShell and look for "IPv4 Address"
const LOCAL_IP = '10.128.2.53';

// For development - choose ONE of these modes:
const DEV_MODE = 'LOCALHOST'; // Options: 'LOCAL_NETWORK', 'TUNNEL', 'LOCALHOST'

/**
 * Auto-detect the best API URL based on the platform:
 * - Android emulator: uses 10.0.2.2 (maps to host localhost)
 * - Web browser: uses localhost directly
 * - Physical device: uses local network IP
 */
const getApiUrl = () => {
  if (Platform.OS === 'android') {
    // Android emulator uses 10.0.2.2 to reach host machine's localhost
    return 'http://10.0.2.2:5000/api';
  } else if (Platform.OS === 'web') {
    // Web browser runs on the same machine as the backend
    return 'http://localhost:5000/api';
  } else if (Platform.OS === 'ios') {
    // iOS simulator can use localhost, physical device needs local IP
    return `http://${LOCAL_IP}:5000/api`;
  }
  // Fallback
  return `http://${LOCAL_IP}:5000/api`;
};

export const API_BASE_URL = getApiUrl();

// Export config for debugging
export const API_CONFIG_INFO = {
  platform: Platform.OS,
  url: API_BASE_URL,
  localIP: LOCAL_IP,
};

// Log the configuration on startup (helpful for debugging)
console.log('🌐 API Configuration:', API_CONFIG_INFO);

