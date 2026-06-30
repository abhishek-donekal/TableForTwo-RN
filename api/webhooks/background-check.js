/**
 * POST /api/webhooks/background-check
 *
 * ── Phase 1 — Background Check Webhook ──────────────────────────────────────
 *
 * Receives results from the background check provider (Checkr / Certn / Sterling)
 * when the check completes (typically 24-72h after the joining fee is paid).
 *
 * The provider sends a signed POST request with the check result.
 * We verify their HMAC signature, then update the user's bgCheckStatus.
 *
 * Body (Checkr-compatible format):
 *   { candidateId, reportId, status: 'clear'|'consider', result: 'clear'|'suspended' }
 *
 * After status update:
 *   - CLEAR   → user can now broadcast dates
 *   - FLAGGED → admin review queue
 *   - FAILED  → user is banned, refund issued
 */

const crypto = require('crypto');
const prisma = require('../_lib/prisma');

const BG_CHECK_WEBHOOK_SECRET = process.env.BG_CHECK_WEBHOOK_SECRET;

// Map provider statuses to our BGCheckStatus enum
const STATUS_MAP = {
  clear:     'CLEAR',
  consider:  'FLAGGED',
  suspended: 'FAILED',
  dispute:   'FLAGGED',
};

function verifyBgCheckSignature(rawBody, signature) {
  if (!BG_CHECK_WEBHOOK_SECRET) return true; // Skip in local dev
  const expected = crypto
    .createHmac('sha256', BG_CHECK_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature || '', 'hex'),
    Buffer.from(expected, 'hex')
  );
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['x-checkr-signature'] || req.headers['x-bg-check-signature'];
  if (!verifyBgCheckSignature(req.body, sig)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { candidateId, reportId, status, result, object } = req.body || {};

  // Checkr uses `object` to identify the event type
  if (object !== 'report') {
    return res.status(200).json({ received: true, skipped: true });
  }

  // candidateId is our user's ID stored in the background check provider
  const user = await prisma.user.findFirst({
    where: { bgCheckProviderId: candidateId },
  });

  if (!user) {
    console.error(`[bg-check webhook] Unknown candidateId: ${candidateId}`);
    return res.status(200).json({ received: true, warning: 'User not found' });
  }

  const newStatus  = STATUS_MAP[result || status] || 'FLAGGED';
  const isClear    = newStatus === 'CLEAR';
  const isFailed   = newStatus === 'FAILED';

  await prisma.user.update({
    where: { id: user.id },
    data: {
      bgCheckStatus:      newStatus,
      bgCheckCompletedAt: new Date(),
      bgCheckNotes:       `Provider report ID: ${reportId}. Raw status: ${status}, result: ${result}`,
      // If failed, ban the user
      ...(isFailed && { isBanned: true, banReason: 'Background check failed' }),
    },
  });

  // TODO: Push notification
  //   - CLEAR:  "Your background check is complete. You can now broadcast dates."
  //   - FAILED: "We were unable to approve your membership. You will receive a refund."
  //   - FLAGGED: "Your background check is under review. We'll notify you within 48h."

  if (isFailed) {
    // Issue Stripe refund for the joining fee
    if (user.joiningFeeStripeId) {
      try {
        const refund = await require('../_lib/stripe').refunds.create({
          payment_intent: user.joiningFeeStripeId,
        });
        console.log(`[bg-check] Refund issued for failed check: ${refund.id}`);
      } catch (err) {
        console.error('[bg-check] Refund failed:', err.message);
      }
    }
  }

  return res.status(200).json({
    received:    true,
    userId:      user.id,
    bgStatus:    newStatus,
    isClear,
    isFailed,
  });
};
