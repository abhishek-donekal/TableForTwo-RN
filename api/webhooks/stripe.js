/**
 * POST /api/webhooks/stripe
 *
 * Stripe webhook handler. Receives real-time payment event notifications.
 * MUST be called with the raw body — Stripe validates HMAC signatures
 * using the exact bytes it sent. Do NOT parse body before reaching this handler.
 *
 * Key events handled:
 *   payment_intent.requires_capture → Hold authorized (logs confirmation)
 *   payment_intent.captured         → Bail penalty collected
 *   payment_intent.canceled         → Hold released (date completed)
 *   payment_intent.payment_failed   → Card declined — notify user to update card
 *
 * Register this URL in Stripe Dashboard → Developers → Webhooks.
 */

const stripe = require('../_lib/stripe');
const prisma = require('../_lib/prisma');

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig  = req.headers['stripe-signature'];
  const body = req.body; // Must be raw Buffer — set in vercel.json bodyParser: false

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error('[stripe webhook] Signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook signature error: ${err.message}` });
  }

  const intent = event.data?.object;

  switch (event.type) {
    case 'payment_intent.requires_capture':
      // Hold successfully authorized on customer's card
      console.log(`[stripe] Hold authorized: ${intent.id}`);
      // No DB action needed here — we already updated status in authorize.js
      break;

    case 'payment_intent.captured':
      // $50 bail penalty collected from a user who didn't show up
      await _handleCapture(intent);
      break;

    case 'payment_intent.canceled':
      // Hold released — date completed successfully or mutual cancel
      console.log(`[stripe] Hold released: ${intent.id}`);
      break;

    case 'payment_intent.payment_failed':
      // Card declined during hold placement — notify user
      await _handlePaymentFailed(intent);
      break;

    default:
      // Unhandled event type — acknowledge receipt without processing
      break;
  }

  return res.status(200).json({ received: true });
};

async function _handleCapture(intent) {
  const { commitmentId, userId } = intent.metadata || {};
  if (!commitmentId || !userId) return;

  await prisma.transaction.create({
    data: {
      userId,
      type:         'HOLD_CAPTURE',
      amountCents:  intent.amount_received,
      currency:     intent.currency,
      description:  'Bail penalty — $50 forfeited for no-show',
      stripeId:     intent.id,
      commitmentId,
    },
  });
}

async function _handlePaymentFailed(intent) {
  const { userId, commitmentId, role } = intent.metadata || {};
  if (!userId) return;

  console.error(`[stripe] Payment failed for ${role} (${userId}) on commitment ${commitmentId}`);
  // TODO: Push notification to user to update their payment method
  // TODO: Mark commitment as AWAITING_HOLDS so they can retry
}
