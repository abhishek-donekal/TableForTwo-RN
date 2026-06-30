const prisma = require('./prisma');

/**
 * Find up to 3 eligible candidates for a date broadcast with 100% bidirectional enforcement.
 *
 * @param {string} broadcastId  - The DateBroadcast.id
 * @returns {Promise<Array>}    - Array of clean User objects (≤ 3)
 */
async function findStrictMatches(broadcastId) {
  const broadcast = await prisma.dateBroadcast.findUniqueOrThrow({
    where: { id: broadcastId },
    include: { broadcaster: true },
  });

  const b = broadcast.broadcaster; 

  const candidates = await prisma.user.findMany({
    where: {
      // 1. System/Eligibility Flags
      bgCheckStatus:  'CLEAR',
      hasJoiningFee:  true,
      isActive:       true,
      isBanned:       false,
      zipCode:        broadcast.zipCode,
      id:             { not: b.id },

      // 2. Broadcaster's Hard Preferences (Candidate must match these)
      gender:      { in: b.prefGenders },
      orientation: { in: b.prefOrientations },
      heightCm:    { gte: b.prefHeightMinCm, lte: b.prefHeightMaxCm },
      incomeRange: { in: b.prefIncomeRanges },
      age:         { gte: b.prefAgeMin, lte: b.prefAgeMax },

      // 3. RECIPROCAL CHECKS (Broadcaster must match Candidate's preferences)
      prefGenders:      { has: b.gender },
      prefOrientations: { has: b.orientation },
      prefHeightMinCm:  { lte: b.heightCm },
      prefHeightMaxCm:  { gte: b.heightCm },
      prefIncomeRanges: { has: b.incomeRange },
      prefAgeMin:       { lte: b.age },
      prefAgeMax:       { gte: b.age },

      // 4. Concurrency Guard (Candidate cannot be busy)
      commitmentsAsUser1: {
        none: { status: { in: ['AWAITING_HOLDS', 'HOLDS_PLACED', 'DATE_ACTIVE'] } },
      },
      commitmentsAsUser2: {
        none: { status: { in: ['AWAITING_HOLDS', 'HOLDS_PLACED', 'DATE_ACTIVE'] } },
      },

      // 5. Deduplication Guard
      matchesAsCandidate: {
        none: { broadcastId },
      },
    },

    // Safely takes up to 3 validated, mutually compatible profiles
    take: 3,

    select: {
      id:          true,
      firstName:   true,
      age:         true,
      gender:      true,
      orientation: true,
      heightCm:    true,
      incomeRange: true,
      profession:  true,
      bio:         true,
      zipCode:     true,
    },
  });

  return candidates;
}

module.exports = { findStrictMatches };