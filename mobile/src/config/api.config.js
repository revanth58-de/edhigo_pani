/**
 * API Configuration
 * Central place to manage API URLs for different environments
 * Auto-detects platform so emulator + web work simultaneously
 */
import { Platform } from 'react-native';

// IMPORTANT: Update this IP address with your PC's local IP
// To find your IP: Run `ipconfig` in PowerShell and look for "IPv4 Address"
const LOCAL_IP = '10.123.37.15';

/**
 * Auto-detect the best API URL based on the platform:
 * - Web browser: uses localhost directly
 * - Android / iOS (physical device or emulator): uses local network IP
 *   (10.0.2.2 only works in Android emulator, NOT on physical phones)
 */
const getApiUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:5000/api';
  }
  // Android + iOS physical devices & simulators all use the local network IP
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

