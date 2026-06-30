/**
 * Phase 3a — POST /api/matches/accept
 *
 * Both the broadcaster and the candidate call this endpoint when they accept
 * the proposed introduction. When BOTH have accepted, this endpoint
 * immediately creates a DateCommitment and triggers the dual $50 hold
 * (see /api/holds/authorize).
 *
 * ── Idempotency ────────────────────────────────────────────────────────────
 * The `acceptanceKey` field on DateMatch is a unique, server-generated key.
 * The client sends this key in the request. A database unique constraint on
 * acceptanceKey prevents a second insert if the request is retried
 * (e.g. old user double-taps "Accept"). This is the primary guard against
 * double-charges on a double-tap.
 *
 * Body: { matchId: string, acceptanceKey: string }
 */

const prisma = require('../_lib/prisma');
const { requireAuth } = require('../_lib/auth');
const { authorizeHoldForBoth } = require('../holds/authorize');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const userId = requireAuth(req, res);
  if (!userId) return;

  const { matchId, acceptanceKey } = req.body || {};
  if (!matchId || !acceptanceKey) {
    return res.status(400).json({ error: 'matchId and acceptanceKey required' });
  }

  const match = await prisma.dateMatch.findUnique({
    where: { id: matchId },
    include: { broadcast: { include: { broadcaster: true } } },
  });

  if (!match) return res.status(404).json({ error: 'Match not found' });

  // Verify acceptanceKey matches — prevents spoofed matchId substitution
  if (match.acceptanceKey !== acceptanceKey) {
    return res.status(403).json({ error: 'Invalid acceptance key' });
  }

  if (['DECLINED', 'EXPIRED', 'BOTH_ACCEPTED'].includes(match.status)) {
    return res.status(409).json({ error: `Match is already in state: ${match.status}` });
  }

  // Determine which role this user is playing
  const isBroadcaster = match.broadcast.broadcasterId === userId;
  const isCandidate   = match.candidateId === userId;

  if (!isBroadcaster && !isCandidate) {
    return res.status(403).json({ error: 'You are not a party to this match' });
  }

  // ── Atomic update — use a transaction to prevent race conditions ─────────
  //    If two requests arrive simultaneously (race: both users tap at the
  //    exact same millisecond), the transaction serialises the updates.
  //    The first write will flip status to BOTH_ACCEPTED and create the
  //    commitment. The second will find status === BOTH_ACCEPTED and return 409.

  let updatedMatch;

  await prisma.$transaction(async (tx) => {
    // Re-read inside transaction to get current state under lock
    const current = await tx.dateMatch.findUniqueOrThrow({
      where: { id: matchId },
    });

    if (current.status === 'BOTH_ACCEPTED') {
      // Race condition — other party just accepted milliseconds ago
      updatedMatch = current;
      return;
    }

    const alreadyBroadcasterAccepted = !!current.broadcasterAcceptedAt;
    const alreadyCandidateAccepted   = !!current.candidateAcceptedAt;

    const data = {};

    if (isBroadcaster && !alreadyBroadcasterAccepted) {
      data.broadcasterAcceptedAt = new Date();
      data.status = alreadyCandidateAccepted ? 'BOTH_ACCEPTED' : 'BROADCASTER_ACCEPTED';
    } else if (isCandidate && !alreadyCandidateAccepted) {
      data.candidateAcceptedAt = new Date();
      data.status = alreadyBroadcasterAccepted ? 'BOTH_ACCEPTED' : 'CANDIDATE_ACCEPTED';
    } else {
      // This user already accepted — idempotent, do nothing
      updatedMatch = current;
      return;
    }

    updatedMatch = await tx.dateMatch.update({
      where: { id: matchId },
      data,
    });
  });

  if (updatedMatch.status !== 'BOTH_ACCEPTED') {
    return res.status(200).json({
      matchId,
      status:  updatedMatch.status,
      message: 'Acceptance recorded. Waiting for the other party.',
    });
  }

  // ── BOTH ACCEPTED — create commitment and place holds ───────────────────
  const broadcasterId = match.broadcast.broadcasterId;
  const candidateId   = match.candidateId;

  // Create the DateCommitment record
  const commitment = await prisma.dateCommitment.create({
    data: {
      matchId,
      user1Id: broadcasterId,
      user2Id: candidateId,
      holdAmountCents: 5000, // $50
      status: 'AWAITING_HOLDS',
    },
  });

  // Place the dual $50 hold asynchronously (Stripe takes ~1-2s)
  // We return immediately so the client can show the commitment UI,
  // and the holds complete in the background.
  setImmediate(() => authorizeHoldForBoth(commitment.id).catch(console.error));

  return res.status(200).json({
    status:       'BOTH_ACCEPTED',
    commitmentId: commitment.id,
    message:      'Both parties have committed. Placing $50 hold on both cards now.',
  });
};
