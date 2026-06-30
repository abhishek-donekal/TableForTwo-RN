/**
 * Phase 2 — POST /api/broadcasts/create
 *
 * A verified member announces: "I'm going to zip code X on [date] for [dinner]."
 * The system runs the strict matching engine immediately and creates DateMatch
 * records for up to 3 candidates.
 *
 * Prerequisites (enforced):
 *   - User is authenticated (JWT)
 *   - bgCheckStatus === 'CLEAR'
 *   - hasJoiningFee === true
 *   - No other ACTIVE broadcast
 *   - No active DateCommitment
 *
 * Body:
 *   { zipCode: string, scheduledFor: ISO8601, intentType: string }
 */

const prisma = require('../_lib/prisma');
const { requireAuth } = require('../_lib/auth');
const { findStrictMatches } = require('../_lib/matching');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = requireAuth(req, res);
  if (!userId) return;

  const { zipCode, scheduledFor, intentType = 'Dinner' } = req.body || {};

  if (!zipCode || !scheduledFor) {
    return res.status(400).json({ error: 'zipCode and scheduledFor are required' });
  }

  const scheduledDate = new Date(scheduledFor);
  if (isNaN(scheduledDate.getTime()) || scheduledDate < new Date()) {
    return res.status(400).json({ error: 'scheduledFor must be a valid future date' });
  }

  const VALID_INTENTS = ['Dinner', 'Drinks', 'Coffee', 'Cultural', 'Other'];
  if (!VALID_INTENTS.includes(intentType)) {
    return res.status(400).json({ error: `intentType must be one of: ${VALID_INTENTS.join(', ')}` });
  }

  // ── Validate broadcaster eligibility ────────────────────────────────────
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, bgCheckStatus: true, hasJoiningFee: true, isActive: true, isBanned: true,
      // Prefs needed for matching snapshot
      gender: true, orientation: true, heightCm: true, incomeRange: true, age: true,
      prefGenders: true, prefOrientations: true, prefHeightMinCm: true,
      prefHeightMaxCm: true, prefIncomeRanges: true, prefAgeMin: true, prefAgeMax: true,
    },
  });

  if (!user || !user.isActive || user.isBanned) {
    return res.status(403).json({ error: 'Account is not active' });
  }
  if (user.bgCheckStatus !== 'CLEAR') {
    return res.status(403).json({ error: 'Background check must be cleared before broadcasting', bgCheckStatus: user.bgCheckStatus });
  }
  if (!user.hasJoiningFee) {
    return res.status(403).json({ error: 'Joining fee must be paid before broadcasting' });
  }

  // ── Guard: no concurrent active broadcasts ───────────────────────────────
  const existingBroadcast = await prisma.dateBroadcast.findFirst({
    where: { broadcasterId: userId, status: { in: ['ACTIVE', 'MATCHED'] } },
  });
  if (existingBroadcast) {
    return res.status(409).json({ error: 'You already have an active broadcast', broadcastId: existingBroadcast.id });
  }

  // ── Guard: no active commitment ──────────────────────────────────────────
  const activeCommitment = await prisma.dateCommitment.findFirst({
    where: {
      OR: [{ user1Id: userId }, { user2Id: userId }],
      status: { in: ['AWAITING_HOLDS', 'HOLDS_PLACED', 'DATE_ACTIVE'] },
    },
  });
  if (activeCommitment) {
    return res.status(409).json({ error: 'You have an active commitment. Complete or cancel it before broadcasting.' });
  }

  // ── Create broadcast + run matching in a transaction ────────────────────
  const broadcast = await prisma.dateBroadcast.create({
    data: {
      broadcasterId: userId,
      zipCode,
      intentType,
      scheduledFor:  scheduledDate,
      expiresAt:     new Date(scheduledDate.getTime() - 60 * 60 * 1000), // 1h before date
      status:        'ACTIVE',
      prefSnapshot: {
        gender:          user.gender,
        orientation:     user.orientation,
        heightCm:        user.heightCm,
        incomeRange:     user.incomeRange,
        age:             user.age,
        prefGenders:     user.prefGenders,
        prefOrientations:user.prefOrientations,
        prefHeightMinCm: user.prefHeightMinCm,
        prefHeightMaxCm: user.prefHeightMaxCm,
        prefIncomeRanges:user.prefIncomeRanges,
        prefAgeMin:      user.prefAgeMin,
        prefAgeMax:      user.prefAgeMax,
      },
    },
  });

  // ── Run the strict matching engine ───────────────────────────────────────
  const candidates = await findStrictMatches(broadcast.id);

  if (candidates.length === 0) {
    // No matches found — broadcast sits ACTIVE until it expires
    return res.status(200).json({
      broadcastId: broadcast.id,
      status:      'ACTIVE',
      matches:     [],
      message:     'No matching members in this area right now. We will notify you when a match appears.',
    });
  }

  // ── Create DateMatch records for each candidate ─────────────────────────
  const matches = await prisma.$transaction(
    candidates.map(c => prisma.dateMatch.create({
      data: {
        broadcastId: broadcast.id,
        candidateId: c.id,
        status:      'PENDING',
      },
    }))
  );

  // Update broadcast to MATCHED state
  await prisma.dateBroadcast.update({
    where:  { id: broadcast.id },
    data:   { status: 'MATCHED' },
  });

  // TODO: Send push notifications to each candidate via FCM / APNs

  return res.status(201).json({
    broadcastId: broadcast.id,
    status:      'MATCHED',
    matchCount:  matches.length,
    matches:     candidates.map((c, i) => ({
      matchId:     matches[i].id,
      candidateId: c.id,
      firstName:   c.firstName,
      age:         c.age,
      profession:  c.profession,
    })),
  });
};
