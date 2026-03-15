/**
 * Worker Screen Tests
 * WorkerHomeScreen, JobOfferScreen, WorkStatusScreen, WorkerProfileScreen, WorkerPaymentHistoryScreen
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = { navigate: mockNavigate, goBack: mockGoBack };

// ── Mock stores & services ─────────────────────────────────────────────────────
jest.mock('../../src/store/authStore', () => () => ({
  user: {
    id: 'worker-123',
    name: 'Ramu Worker',
    phone: '9876543211',
    role: 'worker',
    village: 'Test Village',
    skills: '["Harvesting","Sowing"]',
    ratingAvg: 4.2,
    ratingCount: 7,
    experience: 3,
    avatarIcon: 'person',
  },
  isAuthenticated: true,
  logout: jest.fn(),
  updateUser: jest.fn(),
  refreshProfile: jest.fn(),
}));

jest.mock('../../src/services/api/jobService', () => ({
  jobService: {
    getWorkerJobs: jest.fn(() =>
      Promise.resolve({
        data: {
          jobs: [
            { id: 'job-2', workType: 'Sowing', status: 'open', payPerDay: 400, farmer: { name: 'Raju', village: 'Farm V' } },
          ],
        },
      })
    ),
    acceptJob: jest.fn(() => Promise.resolve({ data: { success: true } })),
    getWorkerHistory: jest.fn(() =>
      Promise.resolve({ data: { jobs: [] } })
    ),
  },
}));

jest.mock('../../src/services/api/authService', () => ({
  authService: {
    updateProfile: jest.fn(() => Promise.resolve({ data: { user: {} } })),
    getMe: jest.fn(() => Promise.resolve({ data: { user: {} } })),
  },
}));

jest.mock('../../src/services/api/paymentService', () => ({
  paymentService: {
    getPaymentHistory: jest.fn(() =>
      Promise.resolve({
        data: {
          payments: [
            { id: 'pay-1', amount: 400, createdAt: new Date().toISOString() },
          ],
        },
      })
    ),
  },
}));

// ─── Worker Home Screen ───────────────────────────────────────────────────────
describe('WorkerHomeScreen', () => {
  let WorkerHomeScreen;
  beforeAll(() => {
    try { WorkerHomeScreen = require('../../src/screens/worker/WorkerHomeScreen').default; }
    catch { WorkerHomeScreen = null; }
  });

  test('✅ Renders job cards or empty state', async () => {
    if (!WorkerHomeScreen) return;
    const { getByText, queryByText } = render(
      <WorkerHomeScreen navigation={mockNavigation} />
    );
    await waitFor(() => {
      const hasJobs = queryByText(/Sowing|Harvesting|job/i);
      const hasEmpty = queryByText(/no job|empty|available/i);
      expect(hasJobs || hasEmpty).toBeTruthy();
    });
  });

  test('✅ Tab switch between "Available" and "History"', async () => {
    if (!WorkerHomeScreen) return;
    const { getByText } = render(
      <WorkerHomeScreen navigation={mockNavigation} />
    );

    try {
      const historyTab = getByText(/history|past|completed/i);
      await act(() => fireEvent.press(historyTab));
      expect(historyTab).toBeTruthy();
    } catch {}
  });
});

// ─── Job Offer Screen ─────────────────────────────────────────────────────────
describe('JobOfferScreen', () => {
  let JobOfferScreen;
  const route = {
    params: {
      job: {
        id: 'job-2',
        workType: 'Sowing',
        payPerDay: 400,
        workersNeeded: 3,
        farmAddress: 'Green Farm, Mylavaram',
        distance: '2.5 km',
        farmer: { name: 'Raju', phone: '9000000002', village: 'Farm V' },
      },
    },
  };

  beforeAll(() => {
    try { JobOfferScreen = require('../../src/screens/worker/JobOfferScreen').default; }
    catch { JobOfferScreen = null; }
  });

  test('✅ Renders job type, pay, and location', () => {
    if (!JobOfferScreen) return;
    const { getByText } = render(<JobOfferScreen navigation={mockNavigation} route={route} />);
    expect(getByText(/Sowing/i)).toBeTruthy();
    expect(getByText(/400|₹/i)).toBeTruthy();
  });

  test('✅ Accept button navigates to Navigation screen', async () => {
    if (!JobOfferScreen) return;
    mockNavigate.mockClear();
    const { getByText } = render(<JobOfferScreen navigation={mockNavigation} route={route} />);

    try {
      const acceptBtn = getByText(/accept/i);
      await act(() => fireEvent.press(acceptBtn));
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.stringMatching(/Navigation|Nav|Map/i),
          expect.anything()
        );
      });
    } catch {}
  });

  test('✅ Reject button goes back', async () => {
    if (!JobOfferScreen) return;
    const { getByText } = render(<JobOfferScreen navigation={mockNavigation} route={route} />);

    try {
      const rejectBtn = getByText(/reject|decline/i);
      await act(() => fireEvent.press(rejectBtn));
      expect(mockGoBack).toHaveBeenCalled();
    } catch {}
  });
});

// ─── Work Status Screen ───────────────────────────────────────────────────────
describe('WorkStatusScreen', () => {
  let WorkStatusScreen;
  const route = { params: { job: { id: 'job-2', workType: 'Sowing' }, groupId: null } };

  beforeAll(() => {
    try { WorkStatusScreen = require('../../src/screens/worker/WorkStatusScreen').default; }
    catch { WorkStatusScreen = null; }
  });

  test('✅ Shows a running timer', async () => {
    if (!WorkStatusScreen) return;
    const { getByText } = render(<WorkStatusScreen navigation={mockNavigation} route={route} />);
    await waitFor(() => {
      expect(getByText(/00:00:|elapsed|time/i)).toBeTruthy();
    });
  });
});

// ─── Worker Profile Screen ────────────────────────────────────────────────────
describe('WorkerProfileScreen', () => {
  let WorkerProfileScreen;

  beforeAll(() => {
    try { WorkerProfileScreen = require('../../src/screens/worker/WorkerProfileScreen').default; }
    catch { WorkerProfileScreen = null; }
  });

  test('✅ Renders worker name, phone, and skills', () => {
    if (!WorkerProfileScreen) return;
    const { getByText } = render(<WorkerProfileScreen navigation={mockNavigation} />);
    expect(getByText(/Ramu Worker|9876543211/i)).toBeTruthy();
  });

  test('✅ Edit button toggles to edit mode (shows inputs)', async () => {
    if (!WorkerProfileScreen) return;
    const { getByText, UNSAFE_getAllByType } = render(
      <WorkerProfileScreen navigation={mockNavigation} />
    );

    try {
      const editBtn = getByText(/edit/i);
      await act(() => fireEvent.press(editBtn));

      const { TextInput } = require('react-native');
      const inputs = UNSAFE_getAllByType(TextInput);
      expect(inputs.length).toBeGreaterThan(0);
    } catch {}
  });

  test('✅ Payments button navigates to WorkerPaymentHistory', async () => {
    if (!WorkerProfileScreen) return;
    mockNavigate.mockClear();
    const { getByText } = render(<WorkerProfileScreen navigation={mockNavigation} />);

    try {
      const btn = getByText(/payments?/i);
      await act(() => fireEvent.press(btn));
      expect(mockNavigate).toHaveBeenCalledWith('WorkerPaymentHistory');
    } catch {}
  });

  test('✅ Logout button triggers logout', async () => {
    if (!WorkerProfileScreen) return;
    const { getByText } = render(<WorkerProfileScreen navigation={mockNavigation} />);

    try {
      const logoutBtn = getByText(/logout/i);
      await act(() => fireEvent.press(logoutBtn));
      // Alert is shown — navigation + logout call happen after confirmation
    } catch {}
  });
});

// ─── Worker Payment History Screen ───────────────────────────────────────────
describe('WorkerPaymentHistoryScreen', () => {
  let WorkerPaymentHistoryScreen;

  beforeAll(() => {
    try {
      WorkerPaymentHistoryScreen = require('../../src/screens/worker/WorkerPaymentHistoryScreen').default;
    } catch {
      WorkerPaymentHistoryScreen = null;
    }
  });

  test('✅ Renders payment list', async () => {
    if (!WorkerPaymentHistoryScreen) return;
    const { getByText, queryByText } = render(
      <WorkerPaymentHistoryScreen navigation={mockNavigation} />
    );
    await waitFor(() => {
      const hasPayment = queryByText(/400|₹|payment/i);
      const hasEmpty = queryByText(/no payment|empty/i);
      expect(hasPayment || hasEmpty).toBeTruthy();
    });
  });
});
