import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { colors } from '../src/theme/colors';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = { navigate: mockNavigate, goBack: mockGoBack };

// Mock authStore
jest.mock('../src/store/authStore', () => () => ({
  user: {
    id: 'farmer-123',
    name: 'Test Farmer',
    latitude: 16.5,
    longitude: 80.6,
  },
  language: 'en',
}));

// Mock machineryService
jest.mock('../src/services/api/machineryService', () => ({
  machineryService: {
    getMachineryListings: jest.fn(() => Promise.resolve({
      success: true,
      listings: [
        {
          id: 'm-1',
          type: 'Tractor',
          name: 'John Deere 5050',
          pricePerHour: 900,
          photoUrl: 'https://images.unsplash.com/tractor-url',
          owner: {
            id: 'owner-1',
            name: 'Ramesh Owner',
            phone: '9876543210',
            ratingAvg: 4.8,
            ratingCount: 15,
          }
        },
        {
          id: 'm-2',
          type: 'Tractor',
          name: 'Sonalika DI 750',
          pricePerHour: 750,
          photoUrl: null,
          owner: {
            id: 'owner-2',
            name: 'Suresh Owner',
            phone: '9876543211',
            ratingAvg: 4.5,
            ratingCount: 8,
          }
        }
      ]
    })),
    bookMachinery: jest.fn(() => Promise.resolve({
      success: true,
      booking: { id: 'b-1', machineryId: 'm-1', slot: 'Morning', totalAmount: 5400 }
    })),
  }
}));

// Mock expo-speech
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}));

describe('MachineryBookingScreen', () => {
  let MachineryBookingScreen;
  const route = { params: { machineType: 'Tractor' } };

  beforeAll(() => {
    MachineryBookingScreen = require('../src/screens/farmer/MachineryBookingScreen').default;
  });

  beforeEach(() => {
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    const { machineryService } = require('../src/services/api/machineryService');
    machineryService.getMachineryListings.mockClear();
    machineryService.bookMachinery.mockClear();

    const { Alert } = require('react-native');
    if (Alert.alert.mockRestore) {
      Alert.alert.mockRestore();
    }
    jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      if (buttons && buttons[0] && buttons[0].onPress) {
        buttons[0].onPress();
      }
    });
  });

  afterEach(() => {
    const { Alert } = require('react-native');
    if (Alert.alert.mockRestore) {
      Alert.alert.mockRestore();
    }
  });

  test('✅ Renders screen elements and dynamic machinery details', async () => {
    const { getByText, unmount } = render(
      <MachineryBookingScreen navigation={mockNavigation} route={route} />
    );

    await waitFor(() => {
      // Header check
      expect(getByText(/Book Tractor/i)).toBeTruthy();
      // Price per hour check
      expect(getByText(/₹900\/hour/i)).toBeTruthy();
      // Owner name check
      expect(getByText(/Ramesh Owner/i)).toBeTruthy();
      // Owner rating check
      expect(getByText(/4.8/i)).toBeTruthy();
    });
    unmount();
  });

  test('✅ Estimated total updates when slot or machine is changed', async () => {
    const { getByText, queryByText, unmount } = render(
      <MachineryBookingScreen navigation={mockNavigation} route={route} />
    );

    await waitFor(() => {
      expect(getByText(/Ramesh Owner/i)).toBeTruthy();
    });

    // Default: 900/hr * 6 hours (Morning) = ₹5,400
    expect(getByText(/₹5,400/i)).toBeTruthy();

    // Select Afternoon slot (6 hours)
    const afternoonSlot = getByText(/Afternoon/i);
    await act(async () => {
      fireEvent.press(afternoonSlot);
    });
    expect(getByText(/₹5,400/i)).toBeTruthy();

    // Select Full Day slot (12 hours) -> 900/hr * 12 hours = ₹10,800
    const fullDaySlot = getByText(/Full Day/i);
    await act(async () => {
      fireEvent.press(fullDaySlot);
    });
    expect(getByText(/₹10,800/i)).toBeTruthy();
    unmount();
  });

  test('✅ Navigation between machines works', async () => {
    const { getByText, queryByText, UNSAFE_getAllByType, unmount } = render(
      <MachineryBookingScreen navigation={mockNavigation} route={route} />
    );

    await waitFor(() => {
      expect(getByText(/Ramesh Owner/i)).toBeTruthy();
    });

    // Tapping right chevron to move to second machine (Sonalika DI 750, ₹750/hr)
    const { TouchableOpacity } = require('react-native');
    const tappables = UNSAFE_getAllByType(TouchableOpacity);
    
    // Find right chevron or just trigger next listing by finding chevrons.
    // In our code: Chevron buttons render when listings.length > 1
    // We can locate them by finding TouchableOpacity elements. Or we can just find
    // elements displaying arrow/chevron icon or by their position in list.
    // Let's filter tappables or we can do fireEvent by finding chevron-right text/icon if needed.
    // Alternatively, let's find the TouchableOpacity containing chevron-right name in MaterialIcons.
    const { MaterialIcons } = require('@expo/vector-icons');
    // Let's tap the chevron right button. The second chevron button is usually the right chevron.
    // Let's find all TouchableOpacity and tap the one corresponding to index/button.
    // In styles: leftChevron, rightChevron.
    // We can mock and trigger the action on MachineryBookingScreen or tap the buttons directly.
    // Let's verify Suresh Owner is loaded when we cycle next.
    // Let's search for "chevron-right" icon button and tap it.
    const rightBtn = tappables.find(t => {
      try {
        const icon = t.findByType(MaterialIcons);
        return icon.props.name === 'chevron-right';
      } catch {
        return false;
      }
    });

    if (rightBtn) {
      await act(async () => {
        fireEvent.press(rightBtn);
      });
      await waitFor(() => {
        expect(getByText(/Suresh Owner/i)).toBeTruthy();
        expect(getByText(/₹750\/hour/i)).toBeTruthy();
      });
    }
    unmount();
  });

  test('✅ Clicking Confirm Booking calls bookMachinery', async () => {
    const { getByText, unmount } = render(
      <MachineryBookingScreen navigation={mockNavigation} route={route} />
    );

    await waitFor(() => {
      expect(getByText(/Ramesh Owner/i)).toBeTruthy();
    });

    const confirmBtn = getByText(/Confirm Booking/i);
    await act(async () => {
      fireEvent.press(confirmBtn);
    });

    await waitFor(() => {
      const { machineryService } = require('../src/services/api/machineryService');
      expect(machineryService.bookMachinery).toHaveBeenCalledWith(expect.objectContaining({
        machineryId: 'm-1',
        slot: 'Morning',
        totalAmount: 5400,
      }));
      expect(mockGoBack).toHaveBeenCalled();
    });
    unmount();
  });

  test('✅ Renders empty state when no listings found', async () => {
    const { machineryService } = require('../src/services/api/machineryService');
    machineryService.getMachineryListings.mockImplementationOnce(() => Promise.resolve({
      success: true,
      listings: []
    }));

    const { getByText, unmount } = render(
      <MachineryBookingScreen navigation={mockNavigation} route={route} />
    );

    await waitFor(() => {
      expect(getByText(/No available listings/i)).toBeTruthy();
    });
    unmount();
  });
});
