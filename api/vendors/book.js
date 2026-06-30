/**
 * Phase 4 — POST /api/vendors/book
 *
 * ── Commission Architecture (Stripe Connect) ────────────────────────────────
 *
 * Table for Two is the PLATFORM. Each vendor (OpenTable, Lyft, 1-800-Flowers)
 * is a CONNECTED ACCOUNT (Stripe Connect Express or Standard).
 *
 * Flow for a $200 OpenTable booking:
 *
 *   1.  Customer is charged $200 via our Stripe account (the platform).
 *   2.  We specify `application_fee_amount = 2000` (10% of $200 in cents).
 *   3.  Stripe automatically routes $180 to the vendor's Connect account.
 *   4.  Table for Two retains $20 as platform commission.
 *   5.  We create a VenueBooking / TransportBooking record with the split.
 *
 * No manual transfer math — `application_fee_amount` handles the split atomically.
 *
 * Body:
 *   {
 *     commitmentId: string,
 *     vendorType: 'venue' | 'transport' | 'gift',
 *     vendor: 'OpenTable' | 'Lyft' | '1800Flowers',
 *     vendorAccountId: string,   ← Stripe Connect account ID (acct_xxx)
 *     totalAmountCents: number,
 *     bookingDetails: {
 *       // venue:     { restaurantId, partySize, reservedFor }
 *       // transport: { pickupAddress, dropoffAddress }
 *       // gift:      { deliveryAddress, productSku }
 *     }
 *   }
 */

const stripe = require('../_lib/stripe');
const prisma = require('../_lib/prisma');
const { requireAuth } = require('../_lib/auth');

const COMMISSION_RATE = 0.10; // 10%

const VENDOR_MODEL_MAP = {
  venue:     'venueBooking',
  transport: 'transportBooking',
  gift:      'giftBooking',
};

const VALID_VENDORS = {
  venue:     ['OpenTable', 'Resy'],
  transport: ['Lyft', 'Uber'],
  gift:      ['1800Flowers', 'Teleflora'],
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const userId = requireAuth(req, res);
  if (!userId) return;

  const {
    commitmentId,
    vendorType,
    vendor,
    vendorAccountId,
    totalAmountCents,
    bookingDetails = {},
  } = req.body || {};

  // ── Validation ───────────────────────────────────────────────────────────
  if (!commitmentId || !vendorType || !vendor || !vendorAccountId || !totalAmountCents) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!VENDOR_MODEL_MAP[vendorType]) {
    return res.status(400).json({ error: 'vendorType must be venue, transport, or gift' });
  }

  if (!VALID_VENDORS[vendorType].includes(vendor)) {
    return res.status(400).json({
      error: `vendor must be one of: ${VALID_VENDORS[vendorType].join(', ')} for type ${vendorType}`,
    });
  }

  if (typeof totalAmountCents !== 'number' || totalAmountCents < 100) {
    return res.status(400).json({ error: 'totalAmountCents must be a positive number in cents' });
  }

  // ── Verify commitment belongs to this user and is in HOLDS_PLACED state ──
  const commitment = await prisma.dateCommitment.findUnique({
    where:   { id: commitmentId },
    include: { user1: true, user2: true },
  });

  if (!commitment) return res.status(404).json({ error: 'Commitment not found' });

  const isParty = commitment.user1Id === userId || commitment.user2Id === userId;
  if (!isParty) return res.status(403).json({ error: 'You are not a party to this commitment' });

  if (commitment.status !== 'HOLDS_PLACED') {
    return res.status(409).json({
      error: `Cannot book vendors until commitment is in HOLDS_PLACED state. Current: ${commitment.status}`,
    });
  }

  // ── Check for duplicate booking of same type ─────────────────────────────
  const existingBooking = await prisma[VENDOR_MODEL_MAP[vendorType]].findUnique({
    where: { commitmentId },
  });
  if (existingBooking) {
    return res.status(409).json({
      error: `A ${vendorType} booking already exists for this commitment`,
      bookingId: existingBooking.id,
    });
  }

  // ── Commission math ──────────────────────────────────────────────────────
  const platformFeeCents = Math.round(totalAmountCents * COMMISSION_RATE);
  const vendorPayoutCents = totalAmountCents - platformFeeCents;

  // ── Charge the customer via Stripe Connect ───────────────────────────────
  //    `on_behalf_of` presents the charge on the vendor's Stripe account.
  //    `application_fee_amount` automatically routes commission to us.
  const payer = commitment.user1; // Whoever initiates the booking pays first

  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create(
      {
        amount:                 totalAmountCents,
        currency:               'usd',
        customer:               payer.stripeCustomerId,
        payment_method:         payer.stripePaymentMethodId,
        confirm:                true,
        off_session:            true,
        on_behalf_of:           vendorAccountId, // Vendor's Connect account
        application_fee_amount: platformFeeCents, // Table for Two's 10%
        transfer_data: {
          destination: vendorAccountId, // Route 90% to vendor
        },
        description: `Table for Two — ${vendor} booking`,
        statement_descriptor_suffix: `T42 ${vendor.toUpperCase().slice(0, 10)}`,
        metadata: {
          commitmentId,
          vendorType,
          vendor,
          platformFeeCents,
          vendorPayoutCents,
        },
      },
      { idempotencyKey: `vendor-${commitmentId}-${vendorType}` }
    );
  } catch (stripeErr) {
    console.error('[vendors/book] Stripe error:', stripeErr);
    return res.status(402).json({
      error:   'Payment failed',
      details: stripeErr.message,
    });
  }

  // ── Persist booking record ───────────────────────────────────────────────
  const bookingData = {
    commitmentId,
    vendor,
    vendorAccountId,
    totalAmountCents,
    platformFeeCents,
    vendorPayoutCents,
    stripePaymentIntentId: paymentIntent.id,
    status: 'CONFIRMED',
    ...buildBookingFields(vendorType, bookingDetails),
  };

  const booking = await prisma[VENDOR_MODEL_MAP[vendorType]].create({ data: bookingData });

  // ── Log commission to transaction ledger ──────────────────────────────────
  await prisma.transaction.createMany({
    data: [
      {
        userId:      userId,
        type:        'VENDOR_BOOKING',
        amountCents: totalAmountCents,
        currency:    'usd',
        description: `${vendor} booking`,
        stripeId:    paymentIntent.id,
        commitmentId,
      },
      {
        userId:          userId,
        type:            'PLATFORM_COMMISSION',
        amountCents:     platformFeeCents,
        currency:        'usd',
        description:     `10% commission on ${vendor} booking`,
        stripeId:        paymentIntent.id,
        commitmentId,
        vendorBookingRef: booking.id,
      },
    ],
  });

  return res.status(201).json({
    success:         true,
    bookingId:       booking.id,
    vendor,
    vendorType,
    totalAmountCents,
    platformFeeCents,
    vendorPayoutCents,
    commissionRate:  '10%',
    stripePaymentIntentId: paymentIntent.id,
  });
};

function buildBookingFields(vendorType, details) {
  switch (vendorType) {
    case 'venue':
      return { reservedFor: details.reservedFor ? new Date(details.reservedFor) : null };
    case 'transport':
      return { pickupAddress: details.pickupAddress, dropoffAddress: details.dropoffAddress };
    case 'gift':
      return { deliveryAddress: details.deliveryAddress };
    default:
      return {};
  }
}
