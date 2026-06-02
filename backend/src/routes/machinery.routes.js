const express = require('express');
const router = express.Router();
const machineryController = require('../controllers/machinery.controller');
const { authenticate } = require('../middleware/auth');

// Register a new piece of machinery
router.post('/', authenticate, machineryController.registerMachinery);

// Get available listings (filtered by type, sorted by distance)
router.get('/listings', authenticate, machineryController.getMachineryListings);

// Book a time slot on a machine
router.post('/book', authenticate, machineryController.bookMachinery);

// View booking list for current farmer
router.get('/bookings', authenticate, machineryController.getFarmerBookings);

// View owner's own registered machinery listings
router.get('/owner/listings', authenticate, machineryController.getOwnerMachinery);

// View bookings for machinery owned by the current user
router.get('/owner/bookings', authenticate, machineryController.getOwnerBookings);

// Update status of a booking (confirmed/cancelled)
router.patch('/bookings/:bookingId/status', authenticate, machineryController.updateBookingStatus);

module.exports = router;
