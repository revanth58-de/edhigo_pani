import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = { navigate: mockNavigate, goBack: mockGoBack };

const mockSocketService = {
  connect: jest.fn(),
  joinUserRoom: jest.fn(),
  joinJobRoom: jest.fn(),
  joinGroupRoom: jest.fn(),
  onJobCancelled: jest.fn(),
  offJobCancelled: jest.fn(),
  emitLocation: jest.fn(),
  emitGroupLocationUpdate: jest.fn(),
  onGroupLocationBroadcast: jest.fn(),
  offGroupLocationBroadcast: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
};

jest.mock('../src/services/socketService', () => ({
  socketService: mockSocketService,
}));

jest.mock('../src/store/authStore', () => () => ({
  user: {
    id: 'test-user-123',
    name: 'Ramu',
    phone: '9876543211',
    role: 'worker',
  },
  isAuthenticated: true,
}));

describe('Adaptive Location Telemetry Tests', () => {
  let NavigationScreen;
  let GroupMapScreen;
  let Location;
  let watchCallback = null;
  const mockRemove = jest.fn();

  const navigationRoute = {
    params: {
      job: {
        id: 'job-123',
        farmLatitude: 17.3850,
        farmLongitude: 78.4867,
        farmAddress: 'Malkapur Farm',
      },
    },
  };

  const groupMapRoute = {
    params: {
      groupId: 'g-123',
      workerCount: 10,
    },
  };

  beforeAll(() => {
    try {
      NavigationScreen = require('../src/screens/worker/NavigationScreen').default;
      GroupMapScreen = require('../src/screens/leader/GroupMapScreen').default;
      Location = require('expo-location');
    } catch (e) {
      console.warn('Failed to require screens or Location:', e.message);
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    watchCallback = null;
    mockRemove.mockClear();

    if (Location) {
      Location.watchPositionAsync.mockImplementation((options, callback) => {
        watchCallback = callback;
        return Promise.resolve({ remove: mockRemove });
      });
      Location.getCurrentPositionAsync.mockResolvedValue({
        coords: { latitude: 17.3850, longitude: 78.4867, speed: 1 }
      });
    }
  });

  describe('NavigationScreen Telemetry', () => {
    test('✅ Dispatches initial location but filters out stationary or minor movements', async () => {
      if (!NavigationScreen) return;

      render(<NavigationScreen navigation={mockNavigation} route={navigationRoute} />);

      await waitFor(() => {
        expect(Location.watchPositionAsync).toHaveBeenCalled();
      });

      // 1. Initial coordinates watch update (should dispatch because lastDispatched is null)
      await act(async () => {
        watchCallback({
          coords: { latitude: 17.3850, longitude: 78.4867, speed: 2 },
        });
      });

      expect(mockSocketService.emitLocation).toHaveBeenCalledTimes(1);
      expect(mockSocketService.emitLocation).toHaveBeenLastCalledWith(
        expect.objectContaining({
          latitude: 17.3850,
          longitude: 78.4867,
        })
      );

      // 2. Minor movement (less than 20m) -> 17.3850 to 17.3851 is ~11 meters
      await act(async () => {
        watchCallback({
          coords: { latitude: 17.3851, longitude: 78.4867, speed: 2 },
        });
      });

      // Total calls should still be 1 (filtered out)
      expect(mockSocketService.emitLocation).toHaveBeenCalledTimes(1);

      // 3. Stationary check (moved far, but speed is 0) -> should NOT dispatch
      await act(async () => {
        watchCallback({
          coords: { latitude: 17.4000, longitude: 78.5000, speed: 0 },
        });
      });

      // Total calls still 1
      expect(mockSocketService.emitLocation).toHaveBeenCalledTimes(1);

      // 4. Major movement (moved > 20m and NOT stationary) -> should dispatch
      await act(async () => {
        watchCallback({
          coords: { latitude: 17.4000, longitude: 78.5000, speed: 3 },
        });
      });

      // Total calls should be 2
      expect(mockSocketService.emitLocation).toHaveBeenCalledTimes(2);
      expect(mockSocketService.emitLocation).toHaveBeenLastCalledWith(
        expect.objectContaining({
          latitude: 17.4000,
          longitude: 78.5000,
        })
      );
    });
  });

  describe('GroupMapScreen Telemetry', () => {
    test('✅ Dispatches initial getCurrentPosition location and filters watchers adaptively', async () => {
      if (!GroupMapScreen) return;

      render(<GroupMapScreen navigation={mockNavigation} route={groupMapRoute} />);

      await waitFor(() => {
        expect(Location.getCurrentPositionAsync).toHaveBeenCalled();
        expect(Location.watchPositionAsync).toHaveBeenCalled();
      });

      // getCurrentPosition automatically triggers initial dispatch
      expect(mockSocketService.emitGroupLocationUpdate).toHaveBeenCalledTimes(1);
      expect(mockSocketService.emitGroupLocationUpdate).toHaveBeenLastCalledWith(
        expect.objectContaining({
          groupId: 'g-123',
          latitude: 17.3850,
          longitude: 78.4867,
        })
      );

      // 1. Minor movement (less than 20m) -> should not dispatch
      await act(async () => {
        watchCallback({
          coords: { latitude: 17.3851, longitude: 78.4867, speed: 2 },
        });
      });
      expect(mockSocketService.emitGroupLocationUpdate).toHaveBeenCalledTimes(1);

      // 2. Stationary movement -> should not dispatch
      await act(async () => {
        watchCallback({
          coords: { latitude: 17.4000, longitude: 78.5000, speed: 0 },
        });
      });
      expect(mockSocketService.emitGroupLocationUpdate).toHaveBeenCalledTimes(1);

      // 3. Significant moving update -> should dispatch
      await act(async () => {
        watchCallback({
          coords: { latitude: 17.4000, longitude: 78.5000, speed: 2 },
        });
      });
      expect(mockSocketService.emitGroupLocationUpdate).toHaveBeenCalledTimes(2);
      expect(mockSocketService.emitGroupLocationUpdate).toHaveBeenLastCalledWith(
        expect.objectContaining({
          groupId: 'g-123',
          latitude: 17.4000,
          longitude: 78.5000,
        })
      );
    });
  });
});
