/**
 * Returns the correct, navigator-supported screen name for the user's current role.
 * This prevents React Navigation "not handled by any navigator" warnings/errors.
 * 
 * @param {string} screenName - The target screen name (e.g. 'WorkerHome', 'WorkerMachinery')
 * @param {string} role - The user's role ('worker', 'leader', 'farmer', 'machinery')
 * @returns {string} The role-safe screen name supported by the user's current stack navigator.
 */
export const getRoleSafeScreen = (screenName, role) => {
  if (!role) return screenName;

  const name = String(screenName || '').trim();

  // 1. Home screen mapping
  if (['WorkerHome', 'LeaderHome', 'FarmerHome', 'MachineryHome'].includes(name)) {
    if (role === 'worker') return 'WorkerHome';
    if (role === 'leader') return 'LeaderHome';
    if (role === 'farmer') return 'FarmerHome';
    if (role === 'machinery') return 'MachineryHome';
  }

  // 2. Profile screen mapping
  if (['WorkerProfile', 'LeaderProfile', 'FarmerProfile'].includes(name)) {
    if (role === 'farmer') return 'FarmerProfile';
    if (role === 'leader') return 'LeaderProfile';
    return 'WorkerProfile'; // worker and machinery both use WorkerProfile
  }

  // 3. Machinery/Booking mapping
  if (['WorkerMachinery', 'MachineryBooking'].includes(name)) {
    if (role === 'farmer') return 'MachineryBooking';
    return 'WorkerMachinery';
  }

  // 4. Bookings/History mapping
  if (['WorkerBookings', 'FarmerHistory'].includes(name)) {
    if (role === 'farmer') return 'FarmerHistory';
    return 'WorkerBookings';
  }

  // 5. QR Scanner / Attendance mapping
  if (['QRScanner', 'QRAttendance'].includes(name)) {
    if (role === 'farmer') return 'QRAttendance';
    return 'QRScanner';
  }

  // 6. Job Offer mapping
  if (['JobOffer', 'GroupJobOffer'].includes(name)) {
    if (role === 'leader') return 'GroupJobOffer';
    return 'JobOffer';
  }

  return screenName;
};
