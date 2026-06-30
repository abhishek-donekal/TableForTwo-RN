/**
 * Phase 3c — POST /api/holds/settle
 *
 * Resolves the $50 hold after the date window closes.
 *
 * action: 'release'  → Both showed up. Cancel both PaymentIntents.
 *                       Money is returned to both cards.
 *
 * action: 'capture'  → One person bailed. Capture THEIR $50 (it's forfeited).
 *                       Release the other person's hold.
 *
 * action: 'mutual_cancel' → Both agreed to cancel before the date.
 *                            Release both holds (no penalty).
 *
 * Only callable by system or admin — not by end users directly.
 * For production, add admin token verification.
 *
 * Body:
 *   { commitmentId: string, action: 'release'|'capture'|'mutual_cancel', forfeitUserId?: string }
 */

const stripe  = require('../_lib/stripe');
const prisma  = require('../_lib/prisma');

const SYSTEM_ADMIN_KEY = process.env.T42_SYSTEM_ADMIN_KEY;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // System-level auth — not user JWT
  if (req.headers['x-admin-key'] !== SYSTEM_ADMIN_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { commitmentId, action, forfeitUserId } = req.body || {};

  if (!commitmentId || !action) {
    return res.status(400).json({ error: 'commitmentId and action required' });
  }

  if (!['release', 'capture', 'mutual_cancel'].includes(action)) {
    return res.status(400).json({ error: 'action must be release, capture, or mutual_cancel' });
  }

  const commitment = await prisma.dateCommitment.findUniqueOrThrow({
    where: { id: commitmentId },
  });

  if (!['HOLDS_PLACED', 'DATE_ACTIVE'].includes(commitment.status)) {
    return res.status(409).json({
      error: `Commitment is in state ${commitment.status} — cannot settle`,
    });
  }

  const intent1Id = commitment.user1PaymentIntentId;
  const intent2Id = commitment.user2PaymentIntentId;

  if (!intent1Id || !intent2Id) {
    return res.status(409).json({ error: 'Hold payment intents not yet created' });
  }

  try {
    if (action === 'release' || action === 'mutual_cancel') {
      // ── Release both holds — neither party pays ──────────────────────────
      await Promise.all([
        stripe.paymentIntents.cancel(intent1Id),
        stripe.paymentIntents.cancel(intent2Id),
      ]);

      await prisma.dateCommitment.update({
        where: { id: commitmentId },
        data: {
          status:         action === 'mutual_cancel' ? 'CANCELLED_MUTUAL' : 'COMPLETED',
          user1HoldStatus:'RELEASED',
          user2HoldStatus:'RELEASED',
          settledAt:       new Date(),
        },
      });

      await _logSettlement(commitment, 'HOLD_RELEASE', 'Both holds released');

      return res.status(200).json({ success: true, action, commitmentId });
    }

    if (action === 'capture') {
      // ── Capture the bailer's hold, release the other ──────────────────────
      if (!forfeitUserId) {
        return res.status(400).json({ error: 'forfeitUserId required for capture action' });
      }
      if (forfeitUserId !== commitment.user1Id && forfeitUserId !== commitment.user2Id) {
        return res.status(400).json({ error: 'forfeitUserId must be a party to this commitment' });
      }

      const bailerIsUser1  = forfeitUserId === commitment.user1Id;
      const bailerIntentId = bailerIsUser1 ? intent1Id : intent2Id;
      const safeIntentId   = bailerIsUser1 ? intent2Id : intent1Id;

      const [captureResult, cancelResult] = await Promise.allSettled([
        stripe.paymentIntents.capture(bailerIntentId), // Forfeited $50
        stripe.paymentIntents.cancel(safeIntentId),    // Released hold
      ]);

      if (captureResult.status === 'rejected') {
        throw new Error(`Failed to capture bail penalty: ${captureResult.reason?.message}`);
      }

      const newStatus = bailerIsUser1 ? 'FORFEITED_USER1' : 'FORFEITED_USER2';

      await prisma.dateCommitment.update({
        where: { id: commitmentId },
        data: {
          status:          newStatus,
          forfeitedBy:     forfeitUserId,
          user1HoldStatus: bailerIsUser1 ? 'CAPTURED' : 'RELEASED',
          user2HoldStatus: bailerIsUser1 ? 'RELEASED' : 'CAPTURED',
          settledAt:       new Date(),
        },
      });

      await _logSettlement(commitment, 'HOLD_CAPTURE',
        `$50 captured from user ${forfeitUserId} for bailing`);

      return res.status(200).json({ success: true, action, forfeitUserId, commitmentId });
    }
  } catch (err) {
    console.error('[holds/settle]', err);
    return res.status(500).json({ error: err.message });
  }
};

async function _logSettlement(commitment, type, description) {
  const entries = [];
  if (type === 'HOLD_RELEASE') {
    entries.push(
      { userId: commitment.user1Id, type: 'HOLD_RELEASE', amountCents: commitment.holdAmountCents, description },
      { userId: commitment.user2Id, type: 'HOLD_RELEASE', amountCents: commitment.holdAmountCents, description },
    );
  } else {
    entries.push(
      { userId: commitment.forfeitedBy, type: 'HOLD_CAPTURE', amountCents: commitment.holdAmountCents, description },
    );
  }
  await prisma.transaction.createMany({
    data: entries.map(e => ({
      ...e,
      currency:    'usd',
      commitmentId: commitment.id,
    })),
  });
}
