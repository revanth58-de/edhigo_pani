import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = { navigate: mockNavigate, goBack: mockGoBack };

// Mock authStore
jest.mock('../src/store/authStore', () => () => ({
  user: {
    id: 'owner-123',
    name: 'Test Owner',
    latitude: 16.5,
    longitude: 80.6,
  },
  language: 'en',
}));

// Mock machineryService
jest.mock('../src/services/api/machineryService', () => ({
  machineryService: {
    getOwnerListings: jest.fn(() => Promise.resolve({
      success: true,
      listings: [
        {
          id: 'm-1',
          type: 'Tractor',
          name: 'John Deere 5050',
          pricePerHour: 900,
        }
      ]
    })),
    getOwnerBookings: jest.fn(() => Promise.resolve({
      success: true,
      bookings: [
        {
          id: 'b-1',
          date: '2026-07-01T00:00:00.000Z',
          slot: 'Morning',
          totalAmount: 5400,
          status: 'confirmed',
          farmer: { name: 'Rajesh Farmer', phone: '9876543210' },
          machinery: { name: 'John Deere 5050' }
        }
      ]
    })),
    register: jest.fn(() => Promise.resolve({
      success: true,
      machinery: { id: 'm-2', name: 'Sonalika 750', type: 'Tractor', pricePerHour: 800 }
    })),
    updateBookingStatus: jest.fn(() => Promise.resolve({
      success: true,
      booking: { id: 'b-1', status: 'confirmed' }
    })),
  }
}));

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({ coords: { latitude: 16.5, longitude: 80.6 } })),
}));

describe('WorkerMachineryScreen', () => {
  let WorkerMachineryScreen;

  beforeAll(() => {
    WorkerMachineryScreen = require('../src/screens/worker/WorkerMachineryScreen').default;
  });

  beforeEach(() => {
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    const { machineryService } = require('../src/services/api/machineryService');
    machineryService.getOwnerListings.mockClear();
    machineryService.getOwnerBookings.mockClear();
    machineryService.register.mockClear();
  });

  test('✅ Renders active listings tab by default', async () => {
    const { getByText, getAllByText } = render(
      <WorkerMachineryScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      // Header check
      expect(getByText(/My Farm Machinery/i)).toBeTruthy();
      // Tab check
      expect(getAllByText(/My Machines/i).length).toBeGreaterThan(0);
      // Machine listing check
      expect(getByText(/John Deere 5050/i)).toBeTruthy();
      expect(getAllByText(/Tractor/i).length).toBeGreaterThan(0);
      expect(getByText(/₹900\/hr/i)).toBeTruthy();
    });
  });

  test('✅ Toggles to Bookings tab and displays reservations', async () => {
    const { getByText, getAllByText, queryByText } = render(
      <WorkerMachineryScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getAllByText(/My Machines/i).length).toBeGreaterThan(0);
    });

    const bookingsTab = getByText(/Reservations & Bookings/i);
    await act(async () => {
      fireEvent.press(bookingsTab);
    });

    await waitFor(() => {
      // Farmer name check
      expect(getByText(/Booked by Rajesh Farmer/i)).toBeTruthy();
      // Slot check
      expect(getByText(/Morning \(6 AM - 12 PM\)/i)).toBeTruthy();
      // Amount check
      expect(getByText(/₹5400/i)).toBeTruthy();
      // Machine listed check
      expect(queryByText(/₹900\/hr/i)).toBeNull(); // Listing badge hidden on bookings tab
    });
  });

  test('✅ Allows registration of new machinery', async () => {
    const { getByText, getAllByText, getByPlaceholderText } = render(
      <WorkerMachineryScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText(/Register New Machine/i)).toBeTruthy();
    });

    // Tap register button to open form
    const registerBtn = getByText(/Register New Machine/i);
    await act(async () => {
      fireEvent.press(registerBtn);
    });

    // Fill form
    const nameInput = getByPlaceholderText(/e.g. John Deere 5050/i);
    const rateInput = getByPlaceholderText(/e.g. 800/i);

    fireEvent.changeText(nameInput, 'Sonalika 750');
    fireEvent.changeText(rateInput, '800');

    // Tap Tractor type chip
    const typeChip = getAllByText(/Tractor/i)[0];
    fireEvent.press(typeChip);

    // Mock Alert.alert
    const { Alert } = require('react-native');
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    // Submit form
    const submitBtn = getByText(/Register Machine/i);
    await act(async () => {
      fireEvent.press(submitBtn);
    });

    await waitFor(() => {
      const { machineryService } = require('../src/services/api/machineryService');
      expect(machineryService.register).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Sonalika 750',
        type: 'Tractor',
        pricePerHour: 800,
      }));
    });
  });

  test('✅ Renders Accept/Reject buttons on pending bookings and triggers updateBookingStatus', async () => {
    const { machineryService } = require('../src/services/api/machineryService');
    machineryService.getOwnerBookings.mockReturnValueOnce(Promise.resolve({
      success: true,
      bookings: [
        {
          id: 'b-pending',
          date: '2026-07-02T00:00:00.000Z',
          slot: 'Afternoon',
          totalAmount: 4800,
          status: 'pending',
          farmer: { name: 'Suresh Farmer', phone: '9876543211' },
          machinery: { name: 'John Deere 5050' }
        }
      ]
    }));

    const { getByText, getAllByText } = render(
      <WorkerMachineryScreen navigation={mockNavigation} />
    );

    // Switch to Bookings tab
    await waitFor(() => {
      expect(getAllByText(/My Machines/i).length).toBeGreaterThan(0);
    });

    const bookingsTab = getByText(/Reservations & Bookings/i);
    await act(async () => {
      fireEvent.press(bookingsTab);
    });

    // Check Accept and Reject buttons are displayed
    await waitFor(() => {
      expect(getByText(/Accept/i)).toBeTruthy();
      expect(getByText(/Reject/i)).toBeTruthy();
    });

    // Press Accept
    const acceptBtn = getByText(/Accept/i);
    await act(async () => {
      fireEvent.press(acceptBtn);
    });

    // Check updateBookingStatus was called
    expect(machineryService.updateBookingStatus).toHaveBeenCalledWith('b-pending', 'confirmed');
  });
});
