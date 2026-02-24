/**
 * API Configuration
 * Central place to manage API URLs for different environments
 */

// IMPORTANT: Update this IP address with your PC's local IP
// To find your IP: Run `ipconfig` in PowerShell and look for "IPv4 Address"
const LOCAL_IP = '10.128.2.53';

// For development - choose ONE of these modes:
const DEV_MODE = 'LOCALHOST'; // Options: 'LOCAL_NETWORK', 'TUNNEL', 'LOCALHOST'

/**
 * API URLs for different modes
 */
const API_CONFIGS = {
  // Use this when PC and iPhone are on SAME WiFi (RECOMMENDED - fastest & most reliable)
  LOCAL_NETWORK: `http://${LOCAL_IP}:5000/api`,

  // Use this ONLY if you need public tunnel (different WiFi)
  // Update the URL when you start a new tunnel
  TUNNEL: 'https://your-tunnel-url.loca.lt/api',

  // Use this for Android Emulator or Web testing
  LOCALHOST: 'http://localhost:5000/api',
};

// Select the appropriate API URL based on DEV_MODE
export const API_BASE_URL = API_CONFIGS[DEV_MODE];

// Export config for debugging
export const API_CONFIG_INFO = {
  mode: DEV_MODE,
  url: API_BASE_URL,
  localIP: LOCAL_IP,
};

// Log the configuration on startup (helpful for debugging)
console.log('🌐 API Configuration:', API_CONFIG_INFO);
