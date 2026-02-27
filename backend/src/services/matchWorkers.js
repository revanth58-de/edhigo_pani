/**
 * matchWorkers.js
 * Finds available workers near a farm that match the required work type.
 *
 * Matching criteria (in priority order):
 *  1. Worker is available/online (not working/offline)
 *  2. Worker is within MAX_DISTANCE_KM of the farm
 *  3. Worker has the required skill (or no skills listed → accept any job)
 *
 * Returns an array of matched workers, each enriched with `distanceKm`.
 */

const prisma = require('../config/database');

const MAX_DISTANCE_KM = 10; // Only notify workers within 10 km

// Haversine formula — returns distance in km between two lat/lng points
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
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
// Workers whose skills JSON array contains any of these words are matched
const SKILL_MAP = {
  sowing:     ['sowing', 'seeding', 'planting', 'plowing'],
  harvesting: ['harvesting', 'reaping', 'cutting', 'threshing'],
  irrigation: ['irrigation', 'water', 'pumping'],
  labour:     ['labour', 'labor', 'general', 'loading', 'carrying'],
  tractor:    ['tractor', 'driving', 'machinery', 'plowing'],
};

/**
 * Find available workers that match a job's location + work type.
 *
 * @param {object} job  - { workType, farmLatitude, farmLongitude, workerType }
 * @returns {Array}     - matched workers with { id, name, skills, distanceKm }
 */
const matchWorkers = async (job) => {
  const { workType, farmLatitude, farmLongitude, workerType } = job;

  // If farm has no location, we can't do distance filtering — fall back to all available workers
  const hasLocation = farmLatitude != null && farmLongitude != null;

  // For group jobs, we match leaders instead of individual workers
  const roleFilter = workerType === 'group' ? 'leader' : 'worker';

  // Fetch all available workers/leaders with a known location
  const candidates = await prisma.user.findMany({
    where: {
      role: roleFilter,
      status: { in: ['available', 'online'] },
      ...(hasLocation ? { latitude: { not: null }, longitude: { not: null } } : {}),
    },
    select: {
      id: true,
      name: true,
      skills: true,
      latitude: true,
      longitude: true,
      status: true,
      ratingAvg: true,
    },
  });

  const requiredSkills = SKILL_MAP[workType?.toLowerCase()] || [];

  const matched = [];

  for (const worker of candidates) {
    // ── Distance filter ───────────────────────────────────────────
    let distanceKm = null;
    if (hasLocation && worker.latitude != null && worker.longitude != null) {
      distanceKm = haversineKm(
        farmLatitude,
        farmLongitude,
        worker.latitude,
        worker.longitude
      );
      if (distanceKm > MAX_DISTANCE_KM) continue; // Too far — skip
    }

    // ── Skill filter ──────────────────────────────────────────────
    // Workers with no skills listed are considered general workers → always match
    let skillMatch = true;
    if (worker.skills && requiredSkills.length > 0) {
      try {
        const workerSkills = JSON.parse(worker.skills); // e.g. ["plowing","seeding"]
        const normalized = workerSkills.map((s) => s.toLowerCase());
        skillMatch = requiredSkills.some((req) => normalized.includes(req));
      } catch {
        // If skills field is not valid JSON, treat as match
      }
    }

    if (!skillMatch) continue;

    matched.push({
      ...worker,
      distanceKm: distanceKm != null ? Math.round(distanceKm * 10) / 10 : null,
    });
  }

  // Sort by distance (closest first), then by rating
  matched.sort((a, b) => {
    if (a.distanceKm != null && b.distanceKm != null) {
      return a.distanceKm - b.distanceKm;
    }
    return b.ratingAvg - a.ratingAvg;
  });

  return matched;
};

module.exports = { matchWorkers, haversineKm, MAX_DISTANCE_KM };
