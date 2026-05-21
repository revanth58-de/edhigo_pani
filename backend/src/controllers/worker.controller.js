const prisma = require('../config/database');
const { logger } = require('../middleware/errorHandler');

// GET /api/workers/nearby
// Fetches workers near the group leader, to allow adding them to a group
const getNearbyWorkers = async (req, res, next) => {
  try {
    const leaderId = req.user.id; // leader making the request
    const { lat, lng, radius = 50 } = req.query; // optional params, defaults to 50km
    
    // First let's get the leader to know their location if lat/lng are not provided
    const leader = await prisma.user.findUnique({
      where: { id: leaderId },
      include: { location: true }
    });
    
    let searchLat = parseFloat(lat) || (leader?.location ? leader.location.latitude : null);
    let searchLng = parseFloat(lng) || (leader?.location ? leader.location.longitude : null);

    if (!searchLat || !searchLng) {
      // Default to Hyderabad coordinates if no location found
      searchLat = 17.3850;
      searchLng = 78.4867;
    }

    // Get all users who are workers and are online/available
    const workers = await prisma.user.findMany({
      where: {
        role: 'worker',
      },
      select: {
        id: true,
        name: true,
        phone: true,
        village: true,
        skills: true,
        location: true,
        ratingAvg: true,
        photoUrl: true
      }
    });

    // Simple rough distance filter (bounding box) or Haversine formula
    const workersWithDistance = workers.map(w => {
      const latVal = w.location ? w.location.latitude : null;
      const lngVal = w.location ? w.location.longitude : null;
      
      let extDistance = 0;
      if (latVal != null && lngVal != null) {
        // Haversine formula approximation
        const R = 6371; // km
        const dLat = (latVal - searchLat) * Math.PI / 180;
        const dLon = (lngVal - searchLng) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(searchLat * Math.PI / 180) * Math.cos(latVal * Math.PI / 180) * 
          Math.sin(dLon/2) * Math.sin(dLon/2); 
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        extDistance = R * c;
      }
      
      const { location, ...safeW } = w;
      return {
        ...safeW,
        latitude: latVal,
        longitude: lngVal,
        distanceStr: extDistance ? extDistance.toFixed(1) + ' km away' : 'Unknown distance',
        distance: extDistance || 9999
      };
    });

    // Sort by proximity
    workersWithDistance.sort((a, b) => a.distance - b.distance);

    res.json({ workers: workersWithDistance });
  } catch (error) {
    logger.error('Get nearby workers error', { message: error.message });
    next(error);
  }
};

module.exports = {
  getNearbyWorkers,
};
