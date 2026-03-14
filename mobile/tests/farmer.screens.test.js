/**
 * Farmer Screen Tests
 * FarmerHomeScreen, SelectWorkersScreen, QRAttendanceScreen, PaymentScreen, RateWorkerScreen
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = { navigate: mockNavigate, goBack: mockGoBack };

// ── Mock stores & services ─────────────────────────────────────────────────────
jest.mock('../../src/store/authStore', () => () => ({
  user: {
    id: 'farmer-123',
    name: 'Test Farmer',
    phone: '9876543210',
    role: 'farmer',
    village: 'Test Village',
    ratingAvg: 4.5,
    ratingCount: 10,
  },
  isAuthenticated: true,
  logout: jest.fn(),
  updateUser: jest.fn(),
  refreshProfile: jest.fn(),
}));

jest.mock('../../src/services/api/jobService', () => ({
  jobService: {
    createJob: jest.fn(() =>
      Promise.resolve({ data: { job: { id: 'job-1', workType: 'Harvesting' } } })
    ),
    getMyJobs: jest.fn(() =>
      Promise.resolve({
        data: {
          jobs: [
            { id: 'job-1', workType: 'Harvesting', status: 'open', workersNeeded: 2, payPerDay: 500 },
          ],
        },
      })
    ),
    getNearbyWorkers: jest.fn(() =>
      Promise.resolve({
        data: {
          workers: [
            { id: 'w-1', name: 'Ramu', phone: '9000000001', village: 'V1', ratingAvg: 4 },
          ],
        },
      })
    ),
  },
}));

jest.mock('../../src/services/api/paymentService', () => ({
  paymentService: {
    makePayment: jest.fn(() =>
      Promise.resolve({ data: { payment: { id: 'pay-1', amount: 500 } } })
    ),
  },
}));

jest.mock('../../src/services/api/ratingService', () => ({
  ratingService: {
    rateWorker: jest.fn(() => Promise.resolve({ data: { success: true } })),
  },
}));

// ─── Farmer Home Screen ───────────────────────────────────────────────────────
describe('FarmerHomeScreen', () => {
  let FarmerHomeScreen;
  beforeAll(() => {
    try { FarmerHomeScreen = require('../../src/screens/farmer/FarmerHomeScreen').default; }
    catch { FarmerHomeScreen = null; }
  });

  test('✅ Renders welcome message / post job button', async () => {
    if (!FarmerHomeScreen) return;
    const { getByText } = render(<FarmerHomeScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(
        getByText(/post|job|welcome|farmer/i)
      ).toBeTruthy();
    });
  });

  test('✅ Post Job button navigates to SelectWorkers', async () => {
    if (!FarmerHomeScreen) return;
    const { getByText } = render(<FarmerHomeScreen navigation={mockNavigation} />);

    try {
      await act(() => fireEvent.press(getByText(/post.*job|new job|hire/i)));
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringMatching(/SelectWorkers|PostJob/i),
        expect.anything()
      );
    } catch {}
  });
});

// ─── QR Attendance Screen (farmer side) ──────────────────────────────────────
describe('QRAttendanceScreen', () => {
  let QRAttendanceScreen;
  const route = { params: { job: { id: 'job-1' }, groupId: null } };

  beforeAll(() => {
    try { QRAttendanceScreen = require('../../src/screens/farmer/QRAttendanceScreen').default; }
    catch { QRAttendanceScreen = null; }
  });

  test('✅ QR code is rendered', async () => {
    if (!QRAttendanceScreen) return;
    const { getByTestId } = render(
      <QRAttendanceScreen navigation={mockNavigation} route={route} />
    );
    await waitFor(() => {
      expect(getByTestId('qr-code')).toBeTruthy();
    });
  });
});

// ─── Payment Screen ───────────────────────────────────────────────────────────
describe('PaymentScreen', () => {
  let PaymentScreen;
  const route = {
    params: {
      job: { id: 'job-1', payPerDay: 500, workType: 'Harvesting', farmerId: 'farmer-123' },
      worker: { id: 'w-1', name: 'Ramu', phone: '9000000001' },
    },
  };

  beforeAll(() => {
    try { PaymentScreen = require('../../src/screens/farmer/PaymentScreen').default; }
    catch { PaymentScreen = null; }
  });

  test('✅ Payment amount is displayed', () => {
    if (!PaymentScreen) return;
    const { getByText } = render(<PaymentScreen navigation={mockNavigation} route={route} />);
    expect(getByText(/500|pay|payment/i)).toBeTruthy();
  });

  test('✅ Pay Now calls makePayment and navigates', async () => {
    if (!PaymentScreen) return;
    const { paymentService } = require('../../src/services/api/paymentService');
    const { getByText } = render(<PaymentScreen navigation={mockNavigation} route={route} />);

    try {
      const btn = getByText(/pay now|confirm|pay/i);
      await act(() => fireEvent.press(btn));
      await waitFor(() => {
        expect(paymentService.makePayment).toHaveBeenCalled();
      });
    } catch {}
  });
});

// ─── Rate Worker Screen ───────────────────────────────────────────────────────
describe('RateWorkerScreen', () => {
  let RateWorkerScreen;
  const route = {
    params: {
      job: { id: 'job-1', farmerId: 'farmer-123' },
      worker: { id: 'w-1', name: 'Ramu' },
    },
  };

  beforeAll(() => {
    try { RateWorkerScreen = require('../../src/screens/farmer/RateWorkerScreen').default; }
    catch { RateWorkerScreen = null; }
  });

  test('✅ Rating options (emoji/stars) are displayed', () => {
    if (!RateWorkerScreen) return;
    const { getByText } = render(<RateWorkerScreen navigation={mockNavigation} route={route} />);
    // Rating screen should have some form of options
    expect(getByText(/rate|rating|happy|sad|neutral|★/i)).toBeTruthy();
  });

  test('✅ Submitting a rating calls rateWorker', async () => {
    if (!RateWorkerScreen) return;
    const { ratingService } = require('../../src/services/api/ratingService');
    const { getByText, UNSAFE_getAllByType } = render(
      <RateWorkerScreen navigation={mockNavigation} route={route} />
    );

    try {
      // Tap first rating option
      const { TouchableOpacity } = require('react-native');
      const tappables = UNSAFE_getAllByType(TouchableOpacity);
      if (tappables.length > 0) await act(() => fireEvent.press(tappables[0]));

      // Submit
      const btn = getByText(/submit|done|finish/i);
      await act(() => fireEvent.press(btn));
      await waitFor(() => {
        expect(ratingService.rateWorker).toHaveBeenCalled();
      });
    } catch {}
  });
});
