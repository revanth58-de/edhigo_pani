/**
 * Mobile Test Setup
 * Mocks native modules that can't be tested in a Node environment
 */

// ─── Mock expo-secure-store ────────────────────────────────────────────────────
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// ─── Mock expo-location ────────────────────────────────────────────────────────
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: { latitude: 16.5067, longitude: 80.6494, accuracy: 10 },
    })
  ),
  watchPositionAsync: jest.fn(),
  Accuracy: { BestForNavigation: 6, Balanced: 3 },
}));

// ─── Mock react-native-maps ────────────────────────────────────────────────────
jest.mock('react-native-maps', () => {
  const React = require('react');
  const MockMapView = ({ children, ...props }) =>
    React.createElement('MapView', props, children);
  MockMapView.Animated = MockMapView;
  const MockMarker = (props) => React.createElement('Marker', props);
  const MockPolyline = (props) => React.createElement('Polyline', props);
  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    Polyline: MockPolyline,
    PROVIDER_GOOGLE: 'google',
    AnimatedRegion: jest.fn(),
  };
});

// ─── Mock expo-speech ─────────────────────────────────────────────────────────
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}));

// ─── Mock expo-linear-gradient ────────────────────────────────────────────────
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  return {
    LinearGradient: ({ children, ...props }) =>
      React.createElement('LinearGradient', props, children),
  };
});

// ─── Mock expo-notifications ──────────────────────────────────────────────────
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  requestPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  setNotificationHandler: jest.fn(),
  getExpoPushTokenAsync: jest.fn(() =>
    Promise.resolve({ data: 'ExponentPushToken[test]' })
  ),
}));

// ─── Mock @react-native-async-storage/async-storage ───────────────────────────
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// ─── Mock axios ────────────────────────────────────────────────────────────────
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
  defaults: { headers: { common: {} } },
}));

// ─── Mock react-native-qrcode-svg ─────────────────────────────────────────────
jest.mock('react-native-qrcode-svg', () => {
  const React = require('react');
  return ({ value }) => React.createElement('QRCode', { testID: 'qr-code', value });
});

// ─── Mock socket.io-client ────────────────────────────────────────────────────
jest.mock('socket.io-client', () => {
  const on = jest.fn();
  const emit = jest.fn();
  const off = jest.fn();
  return jest.fn(() => ({ on, emit, off, connect: jest.fn(), disconnect: jest.fn() }));
});

// ─── Mock Linking ────────────────────────────────────────────────────────────
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
}));

// ─── Mock expo-device ─────────────────────────────────────────────────────────
jest.mock('expo-device', () => ({
  isDevice: true,
}));

// ─── Mock expo-constants ──────────────────────────────────────────────────────
jest.mock('expo-constants', () => ({
  appOwnership: 'standalone',
  expoConfig: { extra: { eas: { projectId: 'test-project-id' } } },
}));
