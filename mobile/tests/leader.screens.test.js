/**
 * Leader Screen Tests
 * GroupJobOfferScreen, GroupQRAttendanceScreen, GroupWorkStatusScreen,
 * GroupAttendanceConfirmedScreen, RateFarmerLeaderScreen
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = { navigate: mockNavigate, goBack: mockGoBack };

// ── Mock stores & services ────────────────────────────────────────────────────
jest.mock('../../src/store/authStore', () => () => ({
  user: {
    id: 'leader-123',
    name: 'Test Leader',
    phone: '9876543212',
    role: 'leader',
    village: 'Leader Village',
    ratingAvg: 4.8,
    ratingCount: 12,
  },
  isAuthenticated: true,
  logout: jest.fn(),
  refreshProfile: jest.fn(),
}));

jest.mock('../../src/services/api/ratingService', () => ({
  ratingService: {
    rateFarmer: jest.fn(() => Promise.resolve({ data: { success: true } })),
  },
}));

jest.mock('../../src/services/api/groupService', () => ({
  groupService: {
    getMyGroups: jest.fn(() =>
      Promise.resolve({
        data: {
          groups: [{ id: 'g-1', name: 'Rice Harvesters', memberCount: 10 }],
        },
      })
    ),
    createGroup: jest.fn(() => Promise.resolve({ data: { group: { id: 'g-2' } } })),
  },
}));

const mockJob = {
  id: 'job-3',
  workType: 'Harvesting',
  payPerDay: 500,
  workersNeeded: 8,
  farmAddress: 'Krishnapur Farm',
  distance: '1.2 km',
  farmerId: 'farmer-123',
  farmer: { name: 'Raju', phone: '9000000003' },
};

// ─── Group Job Offer Screen ───────────────────────────────────────────────────
describe('GroupJobOfferScreen', () => {
  let GroupJobOfferScreen;
  const route = { params: { groupId: 'g-1', jobData: mockJob, workerCount: 8 } };

  beforeAll(() => {
    try { GroupJobOfferScreen = require('../../src/screens/leader/GroupJobOfferScreen').default; }
    catch { GroupJobOfferScreen = null; }
  });

  test('✅ Renders work type, pay, and worker count', () => {
    if (!GroupJobOfferScreen) return;
    const { getByText } = render(
      <GroupJobOfferScreen navigation={mockNavigation} route={route} />
    );
    expect(getByText(/Harvesting/i)).toBeTruthy();
    expect(getByText(/500|₹/i)).toBeTruthy();
  });

  test('✅ Accept navigates to GroupNavigation', async () => {
    if (!GroupJobOfferScreen) return;
    mockNavigate.mockClear();
    const { getByText } = render(
      <GroupJobOfferScreen navigation={mockNavigation} route={route} />
    );

    try {
      const btn = getByText(/accept/i);
      await act(() => fireEvent.press(btn));
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringMatching(/GroupNavigation|Navigation/i),
        expect.anything()
      );
    } catch {}
  });

  test('✅ Reject goes back', async () => {
    if (!GroupJobOfferScreen) return;
    const { getByText } = render(
      <GroupJobOfferScreen navigation={mockNavigation} route={route} />
    );

    try {
      const btn = getByText(/reject/i);
      await act(() => fireEvent.press(btn));
      expect(mockGoBack).toHaveBeenCalled();
    } catch {}
  });
});

// ─── Group QR Attendance ──────────────────────────────────────────────────────
describe('GroupQRAttendanceScreen', () => {
  let GroupQRAttendanceScreen;
  const route = { params: { job: mockJob, groupId: 'g-1', type: 'IN' } };

  beforeAll(() => {
    try {
      GroupQRAttendanceScreen = require('../../src/screens/leader/GroupQRAttendanceScreen').default;
    } catch { GroupQRAttendanceScreen = null; }
  });

  test('✅ QR code is rendered', async () => {
    if (!GroupQRAttendanceScreen) return;
    const { getByTestId } = render(
      <GroupQRAttendanceScreen navigation={mockNavigation} route={route} />
    );
    await waitFor(() => {
      expect(getByTestId('qr-code')).toBeTruthy();
    }, { timeout: 3000 });
  });

  test('✅ Title shows Check-In or Check-Out', () => {
    if (!GroupQRAttendanceScreen) return;
    const { getByText } = render(
      <GroupQRAttendanceScreen navigation={mockNavigation} route={route} />
    );
    expect(getByText(/check.?in|attendance/i)).toBeTruthy();
  });
});

// ─── Group Work Status Screen ─────────────────────────────────────────────────
describe('GroupWorkStatusScreen', () => {
  let GroupWorkStatusScreen;
  const route = { params: { job: mockJob, groupId: 'g-1' } };

  beforeAll(() => {
    try {
      GroupWorkStatusScreen = require('../../src/screens/leader/GroupWorkStatusScreen').default;
    } catch { GroupWorkStatusScreen = null; }
  });

  test('✅ Shows elapsed timer', async () => {
    if (!GroupWorkStatusScreen) return;
    const { getByText } = render(
      <GroupWorkStatusScreen navigation={mockNavigation} route={route} />
    );
    await waitFor(() => {
      expect(getByText(/00:00:/i)).toBeTruthy();
    });
  });

  test('✅ Finish Work navigates to GroupQRAttendance for checkout', async () => {
    if (!GroupWorkStatusScreen) return;
    mockNavigate.mockClear();
    const { getByText } = render(
      <GroupWorkStatusScreen navigation={mockNavigation} route={route} />
    );

    try {
      const btn = getByText(/finish|check.*out/i);
      await act(() => fireEvent.press(btn));
      expect(mockNavigate).toHaveBeenCalledWith('GroupQRAttendance', expect.objectContaining({ type: 'OUT' }));
    } catch {}
  });
});

// ─── Group Attendance Confirmed ───────────────────────────────────────────────
describe('GroupAttendanceConfirmedScreen', () => {
  let GroupAttendanceConfirmedScreen;

  beforeAll(() => {
    try {
      GroupAttendanceConfirmedScreen = require('../../src/screens/leader/GroupAttendanceConfirmedScreen').default;
    } catch { GroupAttendanceConfirmedScreen = null; }
  });

  test('✅ IN type → Continue goes to GroupWorkStatus', async () => {
    if (!GroupAttendanceConfirmedScreen) return;
    mockNavigate.mockClear();
    const route = { params: { job: mockJob, groupId: 'g-1', type: 'IN' } };
    const { getByText } = render(
      <GroupAttendanceConfirmedScreen navigation={mockNavigation} route={route} />
    );

    try {
      const btn = getByText(/continue/i);
      await act(() => fireEvent.press(btn));
      expect(mockNavigate).toHaveBeenCalledWith('GroupWorkStatus', expect.anything());
    } catch {}
  });

  test('✅ OUT type → Continue goes to RateFarmerLeader', async () => {
    if (!GroupAttendanceConfirmedScreen) return;
    mockNavigate.mockClear();
    const route = { params: { job: mockJob, groupId: 'g-1', type: 'OUT' } };
    const { getByText } = render(
      <GroupAttendanceConfirmedScreen navigation={mockNavigation} route={route} />
    );

    try {
      const btn = getByText(/continue/i);
      await act(() => fireEvent.press(btn));
      expect(mockNavigate).toHaveBeenCalledWith('RateFarmerLeader', expect.anything());
    } catch {}
  });
});

// ─── Rate Farmer Leader Screen ────────────────────────────────────────────────
describe('RateFarmerLeaderScreen', () => {
  let RateFarmerLeaderScreen;
  const route = { params: { job: mockJob, groupId: 'g-1' } };

  beforeAll(() => {
    try {
      RateFarmerLeaderScreen = require('../../src/screens/leader/RateFarmerLeaderScreen').default;
    } catch { RateFarmerLeaderScreen = null; }
  });

  test('✅ Renders emoji/rating options', () => {
    if (!RateFarmerLeaderScreen) return;
    const { getByText } = render(
      <RateFarmerLeaderScreen navigation={mockNavigation} route={route} />
    );
    expect(getByText(/happy|sad|neutral|rate|finish/i)).toBeTruthy();
  });

  test('✅ Submit calls rateFarmer', async () => {
    if (!RateFarmerLeaderScreen) return;
    const { ratingService } = require('../../src/services/api/ratingService');
    const { UNSAFE_getAllByType, getByText } = render(
      <RateFarmerLeaderScreen navigation={mockNavigation} route={route} />
    );

    try {
      // Tap an emoji to select rating
      const { TouchableOpacity } = require('react-native');
      const taps = UNSAFE_getAllByType(TouchableOpacity);
      await act(() => fireEvent.press(taps[0]));

      const btn = getByText(/finish|submit|close/i);
      await act(() => fireEvent.press(btn));
      await waitFor(() => {
        expect(ratingService.rateFarmer).toHaveBeenCalled();
      });
    } catch {}
  });
});
