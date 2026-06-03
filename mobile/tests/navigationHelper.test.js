import { getRoleSafeScreen } from '../src/utils/navigationHelper';

describe('navigationHelper - getRoleSafeScreen', () => {
  test('should return screenName as-is if no role is provided', () => {
    expect(getRoleSafeScreen('WorkerHome', null)).toBe('WorkerHome');
    expect(getRoleSafeScreen('WorkerHome', undefined)).toBe('WorkerHome');
  });

  test('should map Home screens correctly for all roles', () => {
    expect(getRoleSafeScreen('WorkerHome', 'worker')).toBe('WorkerHome');
    expect(getRoleSafeScreen('WorkerHome', 'leader')).toBe('LeaderHome');
    expect(getRoleSafeScreen('WorkerHome', 'farmer')).toBe('FarmerHome');
    expect(getRoleSafeScreen('WorkerHome', 'machinery')).toBe('MachineryHome');

    expect(getRoleSafeScreen('LeaderHome', 'worker')).toBe('WorkerHome');
    expect(getRoleSafeScreen('LeaderHome', 'leader')).toBe('LeaderHome');
    expect(getRoleSafeScreen('LeaderHome', 'farmer')).toBe('FarmerHome');
    expect(getRoleSafeScreen('LeaderHome', 'machinery')).toBe('MachineryHome');
  });

  test('should map Profile screens correctly for all roles', () => {
    expect(getRoleSafeScreen('WorkerProfile', 'farmer')).toBe('FarmerProfile');
    expect(getRoleSafeScreen('WorkerProfile', 'leader')).toBe('LeaderProfile');
    expect(getRoleSafeScreen('WorkerProfile', 'worker')).toBe('WorkerProfile');
    expect(getRoleSafeScreen('WorkerProfile', 'machinery')).toBe('WorkerProfile');

    expect(getRoleSafeScreen('LeaderProfile', 'farmer')).toBe('FarmerProfile');
    expect(getRoleSafeScreen('LeaderProfile', 'leader')).toBe('LeaderProfile');
    expect(getRoleSafeScreen('LeaderProfile', 'worker')).toBe('WorkerProfile');
  });

  test('should map Machinery/Booking screens correctly', () => {
    expect(getRoleSafeScreen('WorkerMachinery', 'farmer')).toBe('MachineryBooking');
    expect(getRoleSafeScreen('WorkerMachinery', 'worker')).toBe('WorkerMachinery');
    expect(getRoleSafeScreen('WorkerMachinery', 'leader')).toBe('WorkerMachinery');
    expect(getRoleSafeScreen('WorkerMachinery', 'machinery')).toBe('WorkerMachinery');
  });

  test('should map Bookings/History screens correctly', () => {
    expect(getRoleSafeScreen('WorkerBookings', 'farmer')).toBe('FarmerHistory');
    expect(getRoleSafeScreen('WorkerBookings', 'worker')).toBe('WorkerBookings');
    expect(getRoleSafeScreen('WorkerBookings', 'leader')).toBe('WorkerBookings');
  });

  test('should map QRScanner/Attendance screens correctly', () => {
    expect(getRoleSafeScreen('QRScanner', 'farmer')).toBe('QRAttendance');
    expect(getRoleSafeScreen('QRScanner', 'worker')).toBe('QRScanner');
    expect(getRoleSafeScreen('QRScanner', 'leader')).toBe('QRScanner');
  });

  test('should return screenName as-is for unmapped screens', () => {
    expect(getRoleSafeScreen('AIChatbot', 'farmer')).toBe('AIChatbot');
    expect(getRoleSafeScreen('GroupChat', 'worker')).toBe('GroupChat');
  });
});
