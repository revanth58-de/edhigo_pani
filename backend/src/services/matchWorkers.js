/**
 * matchWorkers.js
 * Finds available workers/groups near a farm that match the required work type.
 *
 * Matching criteria (in priority order):
 *  1. Worker is available/online (not working/offline)
 *  2. Worker/leader is within MAX_DISTANCE_KM of the farm
 *  3. Worker has the required skill (or no skills listed → accept any job)
 *
 * GROUP MODE FIX:
 *  When workerType === 'group', we search for GROUPS (not individual leaders).
 *  A group is only eligible if its joined member count + leader >= workersNeeded.
 *  This prevents notifying 10 separate leaders from 10 small groups when the
 *  farmer needs a SINGLE group of 10.
 *
 * Returns an array of matched workers/leaders, each enriched with `distanceKm`.
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
const SKILL_MAP = {
  sowing:     ['sowing', 'seeding', 'planting', 'plowing'],
  harvesting: ['harvesting', 'reaping', 'cutting', 'threshing'],
  irrigation: ['irrigation', 'water', 'pumping'],
  labour:     ['labour', 'labor', 'general', 'loading', 'carrying'],
  tractor:    ['tractor', 'driving', 'machinery', 'plowing'],
};

/**
 * Find available workers/groups that match a job's location + work type.
 *
 * @param {object} job  - { workType, farmLatitude, farmLongitude, workerType, workersNeeded }
 * @returns {Array}     - matched workers/leaders with { id, name, skills, distanceKm }
 */
const matchWorkers = async (job) => {
  const { workType, farmLatitude, farmLongitude, workerType, workersNeeded } = job;

  // If farm has no location, distance filtering is skipped
  const hasLocation = farmLatitude != null && farmLongitude != null;

  // ── GROUP MODE ────────────────────────────────────────────────────────────
  // BUG FIX: For group jobs, find GROUPS whose total member count (joined + leader)
  // is >= workersNeeded. We then notify only those group leaders.
  // Previously the code matched individual 'leader' role users — meaning 10 leaders
  // from 10 different (possibly tiny) groups were notified for a 10-worker job,
  // instead of finding ONE group that already has 10 members.
  if (workerType === 'group') {
    const neededCount = parseInt(workersNeeded) || 1;

    // Fetch all groups with leaders who are available and have a known location
    const groups = await prisma.group.findMany({
      where: {
        status: { in: ['available', 'forming', 'active'] },
        leader: {
          status: { in: ['available', 'online'] },
          ...(hasLocation ? { latitude: { not: null }, longitude: { not: null } } : {}),
        },
      },
      include: {
        leader: {
          select: {
            id: true,
            name: true,
            skills: true,
            latitude: true,
            longitude: true,
            status: true,
            ratingAvg: true,
          },
        },
        // Only count members who have actually joined (not just invited)
        members: {
          where: { status: 'joined' },
        },
      },
    });

    const matched = [];

    for (const group of groups) {
      const leader = group.leader;
      const joinedMemberCount = group.members.length;

      // ── Capacity filter ── THE CORE FIX ──────────────────────────────
      // Group must have enough members (joined members + leader) to fulfil
      // the job. If the farmer needs 10 workers, the group needs >= 10 people.
      const totalGroupSize = joinedMemberCount + 1; // +1 for the leader
      if (totalGroupSize < neededCount) {
        console.log(
          `⏭  Group "${group.name}" skipped — has ${totalGroupSize} members, needs ${neededCount}`
        );
        continue;
      }

      // ── Distance filter ───────────────────────────────────────────────
      let distanceKm = null;
      if (hasLocation && leader.latitude != null && leader.longitude != null) {
        distanceKm = haversineKm(
          farmLatitude,
          farmLongitude,
          leader.latitude,
          leader.longitude
        );
        if (distanceKm > MAX_DISTANCE_KM) continue; // Too far — skip
      }

      matched.push({
        ...leader,
        groupId: group.id,
        groupName: group.name,
        groupMemberCount: totalGroupSize,
        distanceKm: distanceKm != null ? Math.round(distanceKm * 10) / 10 : null,
      });
    }

    // Sort by distance (closest first), then by leader rating
    matched.sort((a, b) => {
      if (a.distanceKm != null && b.distanceKm != null) {
        return a.distanceKm - b.distanceKm;
      }
      return b.ratingAvg - a.ratingAvg;
    });

    console.log(
      `🎯 Group match: ${matched.length} eligible group(s) with >= ${neededCount} members`
    );
    return matched;
  }

  // ── INDIVIDUAL MODE ───────────────────────────────────────────────────────
  // Fetch all available individual workers with known locations
  const candidates = await prisma.user.findMany({
    where: {
      role: 'worker',
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
    // ── Distance filter ───────────────────────────────────────────────
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

    // ── Skill filter ──────────────────────────────────────────────────
    // Workers with no skills listed → treat as general workers → always match
    let skillMatch = true;
    if (worker.skills && requiredSkills.length > 0) {
      try {
        const workerSkills = JSON.parse(worker.skills);
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
