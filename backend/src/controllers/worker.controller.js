const prisma = require('../config/database');

// GET /api/workers/nearby
// Fetches workers near the group leader, to allow adding them to a group
const getNearbyWorkers = async (req, res, next) => {
  try {
    const leaderId = req.user.id; // leader making the request
    const { lat, lng, radius = 50 } = req.query; // optional params, defaults to 50km
    
    // First let's get the leader to know their location if lat/lng are not provided
    const leader = await prisma.user.findUnique({ where: { id: leaderId } });
    
    let searchLat = parseFloat(lat) || leader.latitude;
    let searchLng = parseFloat(lng) || leader.longitude;

    if (!searchLat || !searchLng) {
      // Default to Hyderabad coordinates if no location found
      searchLat = 17.3850;
      searchLng = 78.4867;
    }

    // Get IDs of workers already in an active group (joined status)
    const occupiedMemberships = await prisma.groupMember.findMany({
      where: { status: 'joined' },
      select: { workerId: true },
    });
    const occupiedWorkerIds = occupiedMemberships.map(m => m.workerId);

    // Get all workers who are available AND not already in a group
    const workers = await prisma.user.findMany({
      where: {
        role: 'worker',
        id: { notIn: occupiedWorkerIds },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        village: true,
        skills: true,
        latitude: true,
        longitude: true,
        ratingAvg: true,
        photoUrl: true
      }
    });

    // Simple rough distance filter (bounding box) or Haversine formula
    // For simplicity, we just return all workers for now and optionally calculate distance
    const workersWithDistance = workers.map(w => {
      let extDistance = 0;
      if (w.latitude && w.longitude) {
        // Haversine formula approximation
        const R = 6371; // km
        const dLat = (w.latitude - searchLat) * Math.PI / 180;
        const dLon = (w.longitude - searchLng) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(searchLat * Math.PI / 180) * Math.cos(w.latitude * Math.PI / 180) * 
          Math.sin(dLon/2) * Math.sin(dLon/2); 
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        extDistance = R * c;
      }
      return {
        ...w,
        distanceStr: extDistance ? extDistance.toFixed(1) + ' km away' : 'Unknown distance',
        distance: extDistance || 9999
      };
    });

    // Sort by proximity
    workersWithDistance.sort((a, b) => a.distance - b.distance);

    res.json({ workers: workersWithDistance });
  } catch (error) {
    console.error('💥 Get Nearby Workers Error:', error);
    next(error);
  }
};

module.exports = {
  getNearbyWorkers,
};
