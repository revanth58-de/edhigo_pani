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
 * Find available workers/leaders that match a job's location + work type.
 *
 * @param {object} job  - { workType, farmLatitude, farmLongitude, workerType, workersNeeded }
 * @returns {Array}     - matched workers/leaders enriched with { distanceKm, memberCount? }
 *
 * GROUP JOBS:
 *  - Targets leaders (role='leader') instead of individual workers.
 *  - Each leader represents their group. `memberCount` is attached so callers
 *    can check whether the group is large enough for the job.
 *  - A group with memberCount >= workersNeeded satisfies the entire requirement
 *    on its own — it should NOT be counted as just 1 worker slot.
 */
const matchWorkers = async (job) => {
  const { workType, farmLatitude, farmLongitude, workerType, workersNeeded } = job;

  // If farm has no location, we can't do distance filtering — fall back to all available
  const hasLocation = farmLatitude != null && farmLongitude != null;

  // For group jobs, we match leaders; for individual jobs, we match workers
  const isGroupJob = workerType === 'group';
  const roleFilter = isGroupJob ? 'leader' : 'worker';

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
      // For group jobs, pull each leader's group + member count in one query
      ...(isGroupJob ? {
        ledGroups: {
          where: { status: { in: ['forming', 'available'] } },
          select: {
            id: true,
            name: true,
            _count: { select: { members: { where: { status: 'joined' } } } },
          },
          take: 1,   // a leader manages one active group at a time
        },
      } : {}),
    },
  });

  const requiredWorkers = parseInt(workersNeeded) || 1; // how many workers the farmer needs

  const requiredSkills = SKILL_MAP[workType?.toLowerCase()] || [];
  // (requiredWorkers already computed above)

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

    // ── Group size filter ─────────────────────────────────────────
    // For group jobs: only include leaders whose group has enough members
    // to fully cover the farmer's requirement.  A group of 10 satisfies a
    // requirement of 10 — it should NOT be treated as contributing 1 slot.
    if (isGroupJob) {
      const group = worker.ledGroups?.[0];
      const memberCount = group?._count?.members ?? 0;
      if (memberCount < requiredWorkers) {
        // Group too small — skip. When workersNeeded=10, only groups with ≥10 members qualify.
        continue;
      }
      matched.push({
        ...worker,
        groupId: group?.id || null,
        groupName: group?.name || null,
        memberCount,            // how many workers this group brings
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
    if (a.distanceKm != null && b.distanceKm != null) {
      return a.distanceKm - b.distanceKm;
    }
    return b.ratingAvg - a.ratingAvg;
  });

  return matched;
};

module.exports = { matchWorkers, haversineKm, MAX_DISTANCE_KM };
