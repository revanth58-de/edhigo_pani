const prisma = require('../config/database');
const { logger } = require('../middleware/errorHandler');

// Normalizes date to midnight UTC to prevent time zone drift during slot checks
const normalizeDate = (dateStr) => {
  const d = new Date(dateStr);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

/**
 * Register a new machine
 * POST /api/machinery
 */
const registerMachinery = async (req, res, next) => {
  try {
    const ownerId = req.user.id;
    const { type, name, pricePerHour, photoUrl, latitude, longitude } = req.body;

    if (!type || !name || !pricePerHour) {
      return res.status(400).json({ success: false, message: 'Type, name, and pricePerHour are required' });
    }

    const machinery = await prisma.machinery.create({
      data: {
        ownerId,
        type,
        name,
        pricePerHour: parseFloat(pricePerHour),
        photoUrl,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
      },
    });

    res.status(201).json({ success: true, machinery });
  } catch (error) {
    logger.error('Register machinery error', { message: error.message });
    next(error);
  }
};

/**
 * Get nearby available machinery listings (filtered by type)
 * GET /api/machinery/listings
 */
const getMachineryListings = async (req, res, next) => {
  try {
    const { type, lat, lng, radius = 50 } = req.query; // 50km default search boundary
    
    let where = { status: 'available' };
    if (type) {
      where.type = type;
    }

    const machineries = await prisma.machinery.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            phone: true,
            photoUrl: true,
            ratingAvg: true,
            ratingCount: true,
          },
        },
      },
    });

    // Compute Haversine distance if query lat/lng are provided
    let listings = machineries;
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);

      const allListings = machineries.map((m) => {
        if (m.latitude && m.longitude) {
          const R = 6371; // Earth radius in km
          const dLat = (m.latitude - userLat) * (Math.PI / 180);
          const dLng = (m.longitude - userLng) * (Math.PI / 180);
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(userLat * (Math.PI / 180)) *
              Math.cos(m.latitude * (Math.PI / 180)) *
              Math.sin(dLng / 2) *
              Math.sin(dLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distance = R * c;
          return { ...m, distance };
        }
        return { ...m, distance: null };
      });

      const filteredListings = allListings.filter(
        (m) => m.distance === null || m.distance <= parseFloat(radius)
      );

      // If no listings within the radius, show all listings sorted by distance as fallback
      listings = filteredListings.length > 0 ? filteredListings : allListings;

      listings.sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    }

    res.json({ success: true, listings });
  } catch (error) {
    logger.error('Get machinery listings error', { message: error.message });
    next(error);
  }
};

/**
 * Place a new machinery booking
 * POST /api/machinery/book
 */
const bookMachinery = async (req, res, next) => {
  try {
    const farmerId = req.user.id;
    const { machineryId, date, slot, totalAmount, latitude, longitude, address } = req.body;

    if (!machineryId || !date || !slot || !totalAmount) {
      return res.status(400).json({ success: false, message: 'All booking fields are required' });
    }

    const machinery = await prisma.machinery.findUnique({
      where: { id: machineryId },
      include: {
        owner: {
          select: {
            id: true,
            pushToken: true,
          },
        },
      },
    });

    if (!machinery) {
      return res.status(404).json({ success: false, message: 'Machinery not found' });
    }

    if (machinery.status !== 'available') {
      return res.status(400).json({ success: false, message: 'Machinery is not available for booking' });
    }

    const normalizedDate = normalizeDate(date);

    // Enforce conflict checking: cannot double-book same slot & date
    const existing = await prisma.machineryBooking.findFirst({
      where: {
        machineryId,
        date: normalizedDate,
        slot,
        status: { in: ['pending', 'confirmed'] },
      },
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Machinery is already booked for this slot' });
    }

    const booking = await prisma.machineryBooking.create({
      data: {
        machineryId,
        farmerId,
        date: normalizedDate,
        slot,
        totalAmount: parseFloat(totalAmount),
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        address: address || null,
      },
    });

    // Create database notification and send push alerts for the machinery owner
    try {
      const farmer = await prisma.user.findUnique({
        where: { id: farmerId },
        select: { name: true },
      });
      const { createNotification, sendPush } = require('../services/pushNotification');
      const formattedDate = new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      const notifTitle = '🚜 New Machinery Booking!';
      const notifBody = `${farmer?.name || 'A farmer'} booked your ${machinery.name} (${machinery.type}) for ${slot} on ${formattedDate}.`;

      await createNotification(machinery.ownerId, notifTitle, notifBody, {
        bookingId: booking.id,
        screen: 'WorkerMachinery',
      });

      if (machinery.owner?.pushToken) {
        await sendPush(machinery.owner.pushToken, notifTitle, notifBody, {
          bookingId: booking.id,
          screen: 'WorkerMachinery',
        });
      }
    } catch (notifError) {
      logger.error('Failed to dispatch machinery booking notification', { message: notifError.message });
    }

    res.status(201).json({ success: true, booking });
  } catch (error) {
    logger.error('Book machinery error', { message: error.message });
    next(error);
  }
};

/**
 * Get bookings for the current farmer
 * GET /api/machinery/bookings
 */
const getFarmerBookings = async (req, res, next) => {
  try {
    const farmerId = req.user.id;
    const bookings = await prisma.machineryBooking.findMany({
      where: { farmerId },
      include: {
        machinery: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
        attendances: true,
        payments: true,
      },
      orderBy: { date: 'desc' },
    });

    res.json({ success: true, bookings });
  } catch (error) {
    logger.error('Get farmer bookings error', { message: error.message });
    next(error);
  }
};

/**
 * Get machinery registered by the authenticated owner
 * GET /api/machinery/owner/listings
 */
const getOwnerMachinery = async (req, res, next) => {
  try {
    const ownerId = req.user.id;
    const listings = await prisma.machinery.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, listings });
  } catch (error) {
    logger.error('Get owner machinery error', { message: error.message });
    next(error);
  }
};

/**
 * Get bookings for machinery owned by the authenticated user
 * GET /api/machinery/owner/bookings
 */
const getOwnerBookings = async (req, res, next) => {
  try {
    const ownerId = req.user.id;
    const bookings = await prisma.machineryBooking.findMany({
      where: {
        machinery: {
          ownerId,
        },
      },
      include: {
        farmer: {
          select: {
            id: true,
            name: true,
            phone: true,
            pushToken: true,
          },
        },
        machinery: {
          select: {
            id: true,
            name: true,
            type: true,
            pricePerHour: true,
          },
        },
        attendances: true,
        payments: true,
      },
      orderBy: { date: 'desc' },
    });
    res.json({ success: true, bookings });
  } catch (error) {
    logger.error('Get owner bookings error', { message: error.message });
    next(error);
  }
};

/**
 * Update the status of a booking (confirmed/cancelled)
 * PATCH /api/machinery/bookings/:bookingId/status
 */
const updateBookingStatus = async (req, res, next) => {
  try {
    const ownerId = req.user.id;
    const { bookingId } = req.params;
    const { status } = req.body; // 'confirmed', 'cancelled', 'in_progress', or 'completed'

    if (!status || !['confirmed', 'cancelled', 'in_progress', 'completed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const booking = await prisma.machineryBooking.findUnique({
      where: { id: bookingId },
      include: {
        machinery: true,
        farmer: {
          select: {
            id: true,
            pushToken: true,
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.machinery.ownerId !== ownerId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to update this booking' });
    }

    const updatedBooking = await prisma.machineryBooking.update({
      where: { id: bookingId },
      data: { status },
    });

    // Notify farmer of the updated status
    try {
      const { createNotification, sendPush } = require('../services/pushNotification');
      const isConfirmed = status === 'confirmed';
      const notifTitle = isConfirmed ? '🚜 Booking Confirmed!' : '❌ Booking Declined';
      const formattedDate = new Date(booking.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      const notifBody = isConfirmed
        ? `Your booking request for ${booking.machinery.name} (${booking.slot}) on ${formattedDate} has been confirmed by the owner.`
        : `Your booking request for ${booking.machinery.name} (${booking.slot}) on ${formattedDate} was declined by the owner.`;

      await createNotification(booking.farmerId, notifTitle, notifBody, {
        bookingId: booking.id,
        screen: 'MachineryBooking',
      });

      if (booking.farmer?.pushToken) {
        await sendPush(booking.farmer.pushToken, notifTitle, notifBody, {
          bookingId: booking.id,
          screen: 'MachineryBooking',
        });
      }
    } catch (notifError) {
      logger.error('Failed to notify farmer of booking status change', { message: notifError.message });
    }

    res.json({ success: true, booking: updatedBooking });
  } catch (error) {
    logger.error('Update booking status error', { message: error.message });
    next(error);
  }
};

module.exports = {
  registerMachinery,
  getMachineryListings,
  bookMachinery,
  getFarmerBookings,
  getOwnerMachinery,
  getOwnerBookings,
  updateBookingStatus,
};
