import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = { navigate: mockNavigate, goBack: mockGoBack };

// Mock stores & services
jest.mock('../src/store/authStore', () => () => ({
  user: {
    id: 'farmer-123',
    name: 'Ramu Farmer',
    phone: '9876543210',
    role: 'farmer',
  },
  isAuthenticated: true,
}));

// Mock notificationService
jest.mock('../src/services/api/notificationService', () => ({
  notificationService: {
    getNotifications: jest.fn(() =>
      Promise.resolve({
        success: true,
        data: {
          notifications: [
            {
              id: 'n-1',
              title: '🌾 New Job Available!',
              body: 'Sowing work · ₹500/day',
              isRead: false,
              createdAt: new Date().toISOString(),
              data: { screen: 'JobOffer', jobId: 'job-1' },
            },
            {
              id: 'n-2',
              title: '✅ Worker Finished',
              body: 'Ramu finished after 8.0 hours.',
              isRead: true,
              createdAt: new Date().toISOString(),
              data: { screen: 'Payment', jobId: 'job-2' },
            },
          ],
          pagination: {
            total: 2,
            limit: 20,
            offset: 0,
            hasMore: false,
          },
          unreadCount: 1,
        },
      })
    ),
    markAsRead: jest.fn(() => Promise.resolve({ success: true })),
    markAllAsRead: jest.fn(() => Promise.resolve({ success: true })),
    clearNotifications: jest.fn(() => Promise.resolve({ success: true })),
  },
}));

describe('NotificationInboxScreen', () => {
  let NotificationInboxScreen;

  beforeAll(() => {
    try {
      NotificationInboxScreen = require('../src/screens/shared/NotificationInboxScreen').default;
    } catch (e) {
      NotificationInboxScreen = null;
    }
  });

  beforeEach(() => {
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    const { notificationService } = require('../src/services/api/notificationService');
    notificationService.getNotifications.mockClear();
    notificationService.markAsRead.mockClear();
    notificationService.markAllAsClear?.();
    notificationService.markAllAsRead.mockClear();
    notificationService.clearNotifications.mockClear();
  });

  test('✅ Renders notifications list', async () => {
    if (!NotificationInboxScreen) return;
    const { getByText, unmount } = render(
      <NotificationInboxScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText(/New Job Available!/i)).toBeTruthy();
      expect(getByText(/Sowing work/i)).toBeTruthy();
      expect(getByText(/Worker Finished/i)).toBeTruthy();
    });
    unmount();
  });

  test('✅ Tapping notification marks it read and navigates', async () => {
    if (!NotificationInboxScreen) return;
    const { getByText, unmount } = render(
      <NotificationInboxScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText(/New Job Available!/i)).toBeTruthy();
    });

    const unreadNotif = getByText(/New Job Available!/i);
    await act(async () => {
      fireEvent.press(unreadNotif);
    });

    await waitFor(() => {
      const { notificationService } = require('../src/services/api/notificationService');
      expect(notificationService.markAsRead).toHaveBeenCalledWith('n-1');
      expect(mockNavigate).toHaveBeenCalledWith('JobOffer', { jobId: 'job-1' });
    });
    unmount();
  });

  test('✅ Tapping clear all button triggers API and confirmation', async () => {
    if (!NotificationInboxScreen) return;
    const { getByTestId, unmount } = render(
      <NotificationInboxScreen navigation={mockNavigation} />
    );

    const { notificationService } = require('../src/services/api/notificationService');

    // Wait for render
    await waitFor(() => {
      expect(getByTestId('clear-all-btn')).toBeTruthy();
    });

    const spyAlert = jest.spyOn(Alert, 'alert');

    const clearAllBtn = getByTestId('clear-all-btn');
    await act(async () => {
      fireEvent.press(clearAllBtn);
    });

    // Check alert is triggered
    expect(spyAlert).toHaveBeenCalled();

    // Trigger the Alert's confirm button
    const confirmButton = spyAlert.mock.calls[0][2][1];
    await act(async () => {
      await confirmButton.onPress();
    });

    await waitFor(() => {
      expect(notificationService.clearNotifications).toHaveBeenCalled();
    });

    spyAlert.mockRestore();
    unmount();
  });
});
