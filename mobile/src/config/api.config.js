/**
 * API Configuration
 * Central place to manage API URLs for different environments
 * Auto-detects platform so emulator + web work simultaneously
 */
import { Platform } from 'react-native';

// IMPORTANT: Update this IP address with your PC's local IP
// To find your IP: Run `ipconfig` in PowerShell and look for "IPv4 Address"
const LOCAL_IP = '10.123.63.30';

// Tunnel URL for REST API calls (works on any network, not just same WiFi).
// Run: npx localtunnel --port 5000  → paste the URL here (no trailing slash)
// Set to null to always use LOCAL_IP instead.
const TUNNEL_URL = null; // Phone is on same WiFi — use local IP directly (faster, no tunnel errors)

/**
 * REST API URL:
 * - Web: localhost
 * - Mobile + tunnel active: HTTPS tunnel URL (any network)
 * - Mobile, no tunnel: local network IP (same WiFi required)
 */
const getApiUrl = () => {
  if (Platform.OS === 'web') return 'http://127.0.0.1:5000/api';
  if (TUNNEL_URL) return `${TUNNEL_URL}/api`;
  return `http://${LOCAL_IP}:5000/api`;
};

/**
 * Socket.IO URL:
 * ALWAYS uses the local IP directly — tunnels (localtunnel/ngrok) cannot
 * reliably relay WebSocket or long-polling connections. The phone must be
 * on the same WiFi as the PC for real-time features to work.
 */
const getSocketUrl = () => {
  if (Platform.OS === 'web') return 'http://127.0.0.1:5000';
  return `http://${LOCAL_IP}:5000`;
};

export const API_BASE_URL = getApiUrl();
export const SOCKET_BASE_URL = getSocketUrl();
export default API_BASE_URL;

export const API_CONFIG_INFO = {
  platform: Platform.OS,
  apiUrl: API_BASE_URL,
  socketUrl: SOCKET_BASE_URL,
  localIP: LOCAL_IP,
};

console.log('🌐 API Configuration:', API_CONFIG_INFO);
