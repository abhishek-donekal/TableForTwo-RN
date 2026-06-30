/**
 * Agent 2 + 4 — Strict Boolean Preference Matching Engine
 *
 * There is NO ELO. There is NO "compatibility score."
 * Every preference is a hard boolean gate. A candidate either passes all
 * criteria or is excluded entirely. Returns at most 3 results.
 *
 * Matching is BIDIRECTIONAL: the broadcaster must also satisfy the
 * candidate's preferences (otherwise the candidate would see a mismatch
 * when the introduction is presented to them).
 */

const prisma = require('./prisma');

/**
 * Find up to 3 eligible candidates for a date broadcast.
 *
 * @param {string} broadcastId  - The DateBroadcast.id
 * @returns {Promise<Array>}    - Array of User objects (≤ 3)
 */
async function findStrictMatches(broadcastId) {
  const broadcast = await prisma.dateBroadcast.findUniqueOrThrow({
    where: { id: broadcastId },
    include: { broadcaster: true },
  });

  const b = broadcast.broadcaster; // broadcaster shorthand

  // ── Step 1: Query all users who pass broadcaster's hard preferences ─────
  //    Uses the composite index on (zipCode, bgCheckStatus, hasJoiningFee, isActive)
  //    + index on (gender, orientation, heightCm, incomeRange, age)

  const candidates = await prisma.user.findMany({
    where: {
      // Must be eligible to participate
      bgCheckStatus:  'CLEAR',
      hasJoiningFee:  true,
      isActive:       true,
      isBanned:       false,

      // Must be in the broadcast's zip code
      zipCode: broadcast.zipCode,

      // Not the broadcaster themselves
      id: { not: b.id },

      // ── Broadcaster's hard preferences (all must pass) ─────────────────
      gender:      { in: b.prefGenders },
      orientation: { in: b.prefOrientations },
      heightCm: {
        gte: b.prefHeightMinCm,
        lte: b.prefHeightMaxCm,
      },
      incomeRange: { in: b.prefIncomeRanges },
      age: {
        gte: b.prefAgeMin,
        lte: b.prefAgeMax,
      },

      // ── Candidate must not already have an active commitment ───────────
      commitmentsAsUser1: {
        none: {
          status: {
            in: ['AWAITING_HOLDS', 'HOLDS_PLACED', 'DATE_ACTIVE'],
          },
        },
      },
      commitmentsAsUser2: {
        none: {
          status: {
            in: ['AWAITING_HOLDS', 'HOLDS_PLACED', 'DATE_ACTIVE'],
          },
        },
      },

      // ── Candidate must not already be matched to this broadcast ────────
      matchesAsCandidate: {
        none: { broadcastId },
      },
    },

    // Limit to 3 — client's specified maximum
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

      // Candidate's own preferences (needed for reciprocal check below)
      prefGenders:      true,
      prefOrientations: true,
      prefHeightMinCm:  true,
      prefHeightMaxCm:  true,
      prefIncomeRanges: true,
      prefAgeMin:       true,
      prefAgeMax:       true,
    },
  });

  // ── Step 2: Reciprocal filter (candidate must also want the broadcaster)
  //    Prisma doesn't support array-contains-element with cross-record checks
  //    in a single query, so we filter in JS after the DB fetch.

  const reciprocalMatches = candidates.filter(c => {
    return (
      c.prefGenders.includes(b.gender) &&
      c.prefOrientations.includes(b.orientation) &&
      b.heightCm >= c.prefHeightMinCm &&
      b.heightCm <= c.prefHeightMaxCm &&
      c.prefIncomeRanges.includes(b.incomeRange) &&
      b.age >= c.prefAgeMin &&
      b.age <= c.prefAgeMax
    );
  });

  // Strip preference fields before returning to client
  return reciprocalMatches.map(({ prefGenders, prefOrientations,
    prefHeightMinCm, prefHeightMaxCm, prefIncomeRanges, prefAgeMin,
    prefAgeMax, ...publicFields }) => publicFields);
}

module.exports = { findStrictMatches };
