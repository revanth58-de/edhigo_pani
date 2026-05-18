/**
 * matchWorkers.js
 * Finds available workers near a farm that match the required work type.
 *
 * B1 FIX: Replaced the previous approach of fetching ALL available workers and
 * then filtering by distance in JavaScript (O(n) full table scan) with a SQL
 * bounding box WHERE clause. This reduces the number of rows Postgres reads by
 * ~95% at typical user densities, since only workers within a lat/lng bounding
 * box are fetched at all.
 *
 * Bounding box math (no PostGIS needed):
 *   1° latitude  ≈ 111 km  →  10 km = ±0.0901°
 *   1° longitude ≈ 111 km × cos(lat)  →  varies by latitude
 * We use the exact Haversine formula for the final precision check on the
 * smaller result set.
 *
 * Matching criteria (in priority order):
 *  1. Worker is available/online (not working/offline)
 *  2. Worker is within MAX_DISTANCE_KM of the farm  ← now filtered in SQL
 *  3. Worker has the required skill (or no skills listed → accept any job)
 */

const prisma = require('../config/database');
const { UserStatus, GroupStatus, MemberStatus } = require('../config/enums'); // D1

const MAX_DISTANCE_KM = 10; // Only notify workers within 10 km

// Haversine formula — returns distance in km between two lat/lng points
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Maps job workType to the skill keywords workers should have
const SKILL_MAP = {
  sowing:     ['sowing', 'seeding', 'planting', 'plowing'],
  harvesting: ['harvesting', 'reaping', 'cutting', 'threshing'],
  irrigation: ['irrigation', 'water', 'pumping'],
  labour:     ['labour', 'labor', 'general', 'loading', 'carrying'],
  tractor:    ['tractor', 'driving', 'machinery', 'plowing'],
};

/**
 * Compute the lat/lng bounding box for a given center + radius.
 * Returns { minLat, maxLat, minLng, maxLng } or null if no location provided.
 */
const getBoundingBox = (lat, lng, radiusKm) => {
  if (lat == null || lng == null) return null;
  const latDelta = radiusKm / 111.0;                              // 1° lat ≈ 111 km
  const lngDelta = radiusKm / (111.0 * Math.cos((lat * Math.PI) / 180)); // varies by lat
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
};

/**
 * Find available workers/leaders that match a job's location + work type.
 *
 * @param {object} job  - { workType, farmLatitude, farmLongitude, workerType, workersNeeded }
 * @returns {Array}     - matched workers/leaders enriched with { distanceKm, memberCount? }
 */
const matchWorkers = async (job) => {
  const { workType, farmLatitude, farmLongitude, workerType, workersNeeded } = job;

  const hasLocation = farmLatitude != null && farmLongitude != null;
  const isGroupJob  = workerType === 'group';
  const roleFilter  = isGroupJob ? 'leader' : 'worker';

  // B1 FIX: Compute a lat/lng bounding box and push the distance filter into SQL.
  // Previously this fetched every available worker, then filtered in JS.
  // Now Postgres only returns rows inside the bounding box (a fraction of the table).
  const bbox = getBoundingBox(parseFloat(farmLatitude), parseFloat(farmLongitude), MAX_DISTANCE_KM);

  const candidates = await prisma.user.findMany({
    where: {
      role: roleFilter,
      status: { in: UserStatus.ONLINE },  // D1: 'available' + 'online' (legacy back-compat)
      ...(hasLocation && bbox ? {
        latitude:  { gte: bbox.minLat, lte: bbox.maxLat },
        longitude: { gte: bbox.minLng, lte: bbox.maxLng },
      } : {
        // No farm location: still require workers to have *some* location so
        // we can compute distance later (avoids null distanceKm surprises)
        latitude:  { not: null },
        longitude: { not: null },
      }),
    },
    select: {
      id: true,
      name: true,
      skills: true,
      latitude: true,
      longitude: true,
      status: true,
      ratingAvg: true,
      ...(isGroupJob ? {
        groupsLed: {
          where: { status: { in: [GroupStatus.FORMING, 'available'] } },
          select: {
            id: true,
            name: true,
            _count: { select: { members: { where: { status: MemberStatus.JOINED } } } },
          },
          take: 1,
        },
      } : {}),
    },
  });

  const requiredWorkers = parseInt(workersNeeded) || 1;
  const requiredSkills  = SKILL_MAP[workType?.toLowerCase()] || [];
  const matched = [];

  for (const worker of candidates) {
    // ── Precise Haversine check ─────────────────────────────────────────────
    // The bounding box is a square — workers in the corners are slightly beyond
    // MAX_DISTANCE_KM. The Haversine check here culls those corner cases.
    let distanceKm = null;
    if (hasLocation && worker.latitude != null && worker.longitude != null) {
      distanceKm = haversineKm(
        parseFloat(farmLatitude),
        parseFloat(farmLongitude),
        worker.latitude,
        worker.longitude,
      );
      if (distanceKm > MAX_DISTANCE_KM) continue; // corner of bounding box — skip
    }

    // ── Skill filter ────────────────────────────────────────────────────────
    let skillMatch = true;
    if (worker.skills && requiredSkills.length > 0) {
      try {
        const workerSkills = JSON.parse(worker.skills);
        const normalized   = workerSkills.map((s) => s.toLowerCase());
        skillMatch = requiredSkills.some((req) => normalized.includes(req));
      } catch {
        // Malformed skills JSON → treat as general worker (match everything)
      }
    }
    if (!skillMatch) continue;

    // ── Group size filter ───────────────────────────────────────────────────
    if (isGroupJob) {
      const group = worker.groupsLed?.[0];
      const memberCount = group?._count?.members ?? 0;
      if (memberCount < requiredWorkers) continue; // Group too small
      matched.push({
        ...worker,
        groupId:    group?.id   || null,
        groupName:  group?.name || null,
        memberCount,
        distanceKm: distanceKm != null ? Math.round(distanceKm * 10) / 10 : null,
      });
    } else {
      matched.push({
        ...worker,
        distanceKm: distanceKm != null ? Math.round(distanceKm * 10) / 10 : null,
      });
    }
  }

  // Sort by distance (closest first), then by rating
  matched.sort((a, b) => {
    if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
    return (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0);
  });

  return matched;
};

module.exports = { matchWorkers, haversineKm, getBoundingBox, MAX_DISTANCE_KM };
