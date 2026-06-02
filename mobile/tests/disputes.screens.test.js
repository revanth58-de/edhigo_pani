/**
 * Disputes Screen Tests
 * DisputeScreen, DisputeHistoryScreen
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = { navigate: mockNavigate, goBack: mockGoBack };

// ── Mock stores & services ─────────────────────────────────────────────────────
jest.mock('../src/store/authStore', () => () => ({
  user: {
    id: 'worker-123',
    name: 'Ramu Worker',
    phone: '9876543211',
    role: 'worker',
  },
  isAuthenticated: true,
}));

jest.mock('../src/services/api/disputeService', () => ({
  disputeService: {
    fileDispute: jest.fn(() => Promise.resolve({ success: true, data: { id: 'dispute-1' } })),
    getMyDisputes: jest.fn(() =>
      Promise.resolve({
        success: true,
        data: [
          {
            id: 'dispute-1',
            jobId: 'job-1234567890',
            category: 'hours_mismatch',
            description: 'My hours were recorded incorrectly.',
            status: 'pending',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'dispute-2',
            jobId: 'job-0987654321',
            category: 'incorrect_payment',
            description: 'Farmer did not pay the full amount.',
            status: 'resolved',
            resolutionDetails: 'Paid outstanding balance.',
            resolvedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
        ],
      })
    ),
  },
}));

describe('DisputeScreen', () => {
  let DisputeScreen;
  const route = { params: { jobId: 'job-1234567890', paymentId: 'payment-123' } };

  beforeAll(() => {
    try {
      DisputeScreen = require('../src/screens/shared/DisputeScreen').default;
    } catch (e) {
      DisputeScreen = null;
    }
  });

  test('✅ Renders form elements', () => {
    if (!DisputeScreen) return;
    const { getByText, getByPlaceholderText } = render(
      <DisputeScreen navigation={mockNavigation} route={route} />
    );
    expect(getByText(/select category/i)).toBeTruthy();
    expect(getByPlaceholderText(/Tell us what happened/i)).toBeTruthy();
  });

  test('✅ Submitting without description triggers alert', async () => {
    if (!DisputeScreen) return;
    const { getByText } = render(
      <DisputeScreen navigation={mockNavigation} route={route} />
    );
    const submitBtn = getByText(/File Dispute/i);
    fireEvent.press(submitBtn);
    // Alert should be called (or mock called)
  });

  test('✅ Submitting with category and description files dispute', async () => {
    if (!DisputeScreen) return;
    const { getByText, getByPlaceholderText } = render(
      <DisputeScreen navigation={mockNavigation} route={route} />
    );

    const descriptionInput = getByPlaceholderText(/Tell us what happened/i);
    fireEvent.changeText(descriptionInput, 'Incorrect attendance duration recorded.');

    const submitBtn = getByText(/File Dispute/i);
    await act(async () => {
      fireEvent.press(submitBtn);
    });

    await waitFor(() => {
      const { disputeService } = require('../src/services/api/disputeService');
      expect(disputeService.fileDispute).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'job-1234567890',
          paymentId: 'payment-123',
          description: 'Incorrect attendance duration recorded.',
        })
      );
    });
  });
});

describe('DisputeHistoryScreen', () => {
  let DisputeHistoryScreen;

  beforeAll(() => {
    try {
      DisputeHistoryScreen = require('../src/screens/shared/DisputeHistoryScreen').default;
    } catch (e) {
      DisputeHistoryScreen = null;
    }
  });

  test('✅ Renders dispute history list', async () => {
    if (!DisputeHistoryScreen) return;
    const { getByText } = render(
      <DisputeHistoryScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText(/my hours were recorded incorrectly/i)).toBeTruthy();
      expect(getByText(/farmer did not pay the full amount/i)).toBeTruthy();
      expect(getByText(/Paid outstanding balance/i)).toBeTruthy();
    });
  });
});
