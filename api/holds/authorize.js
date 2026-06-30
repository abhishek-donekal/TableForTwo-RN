/**
 * Phase 3b — Stripe Dual Authorization Hold
 *
 * Places a $50 manual-capture PaymentIntent on BOTH users' saved cards
 * simultaneously. This is an authorization hold, NOT a charge. The money is
 * ring-fenced on the card but not captured until:
 *   - Date completes → /api/holds/settle?action=release  (cancel intent)
 *   - Someone bails  → /api/holds/settle?action=capture  (capture offender's intent)
 *
 * ── Stripe capture_method: 'manual' ────────────────────────────────────────
 * Stripe holds authorized-but-uncaptured PaymentIntents for up to 7 days.
 * If the date is more than 7 days away, we must re-authorize closer to the date.
 *
 * ── Idempotency ─────────────────────────────────────────────────────────────
 * Stripe idempotency keys (one per user per commitment) prevent double-charges
 * if this function is called twice (retry, network error, double-trigger).
 *
 * POST /api/holds/authorize  (called internally after both-accepted)
 * Body: { commitmentId: string }
 */

const stripe  = require('../_lib/stripe');
const prisma  = require('../_lib/prisma');

const HOLD_AMOUNT_CENTS = 5000; // $50

/**
 * Authorize the $50 hold for both parties of a commitment.
 * Called automatically after BOTH_ACCEPTED — not directly by clients.
 *
 * @param {string} commitmentId
 */
async function authorizeHoldForBoth(commitmentId) {
  const commitment = await prisma.dateCommitment.findUniqueOrThrow({
    where:   { id: commitmentId },
    include: { user1: true, user2: true },
  });

  if (commitment.status !== 'AWAITING_HOLDS') {
    throw new Error(`Cannot authorize holds on commitment in state: ${commitment.status}`);
  }

  const [user1Hold, user2Hold] = await Promise.allSettled([
    _authorizeHold(commitment.user1, commitmentId, 'user1'),
    _authorizeHold(commitment.user2, commitmentId, 'user2'),
  ]);

  // ── Parse results ─────────────────────────────────────────────────────────
  const user1Success = user1Hold.status === 'fulfilled';
  const user2Success = user2Hold.status === 'fulfilled';

  const update = {
    user1PaymentIntentId: user1Success ? user1Hold.value.id   : null,
    user2PaymentIntentId: user2Success ? user2Hold.value.id   : null,
    user1HoldStatus:      user1Success ? 'AUTHORIZED'          : 'FAILED',
    user2HoldStatus:      user2Success ? 'AUTHORIZED'          : 'FAILED',
  };

  if (user1Success && user2Success) {
    update.status = 'HOLDS_PLACED';
  } else {
    // One or both holds failed — cancel the one that succeeded to be fair
    if (user1Success) await stripe.paymentIntents.cancel(user1Hold.value.id);
    if (user2Success) await stripe.paymentIntents.cancel(user2Hold.value.id);
    update.status           = 'AWAITING_HOLDS'; // Revert for retry
    update.user1HoldStatus  = 'FAILED';
    update.user2HoldStatus  = 'FAILED';
  }

  await prisma.dateCommitment.update({ where: { id: commitmentId }, data: update });

  if (!user1Success || !user2Success) {
    const error = user1Hold.reason || user2Hold.reason;
    throw new Error(`Hold failed: ${error?.message || 'Unknown error'}`);
  }

  return update;
}

/**
 * Place a single $50 manual-capture hold for one user.
 * Idempotency key: `hold-{commitmentId}-{role}` ensures safe retries.
 *
 * @private
 */
async function _authorizeHold(user, commitmentId, role) {
  if (!user.stripeCustomerId || !user.stripePaymentMethodId) {
    throw new Error(`${role} (${user.id}) has no saved Stripe payment method`);
  }

  const idempotencyKey = `hold-${commitmentId}-${role}`;

  const intent = await stripe.paymentIntents.create(
    {
      amount:               HOLD_AMOUNT_CENTS,
      currency:             'usd',
      customer:             user.stripeCustomerId,
      payment_method:       user.stripePaymentMethodId,
      capture_method:       'manual',   // Authorization hold — NOT captured yet
      confirm:              true,
      off_session:          true,       // User is not present at this moment
      description:          'Table for Two — $50 Date Commitment Hold',
      statement_descriptor_suffix: 'T42 DATE HOLD',
      metadata: {
        commitmentId,
        userId:  user.id,
        role,
        type:    'date_hold',
      },
    },
    { idempotencyKey }
  );

  if (intent.status !== 'requires_capture') {
    throw new Error(`Unexpected PaymentIntent status for ${role}: ${intent.status}`);
  }

  // Log to transaction ledger
  await prisma.transaction.create({
    data: {
      userId:      user.id,
      type:        'HOLD_AUTHORIZATION',
      amountCents: HOLD_AMOUNT_CENTS,
      currency:    'usd',
      description: 'Date commitment hold authorized',
      stripeId:    intent.id,
      commitmentId,
    },
  });

  return intent;
}

// HTTP handler — for manual triggering / admin retry
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { commitmentId } = req.body || {};
  if (!commitmentId) return res.status(400).json({ error: 'commitmentId required' });

  try {
    const result = await authorizeHoldForBoth(commitmentId);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error('[holds/authorize]', err);
    return res.status(500).json({ error: err.message });
  }
};

module.exports.authorizeHoldForBoth = authorizeHoldForBoth;
