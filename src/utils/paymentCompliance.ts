/**
 * paymentCompliance.ts
 *
 * Apple App Store IAP Compliance — Table for Two
 *
 * Apple Rule 3.1.1  — Digital goods sold in-app must use StoreKit / IAP (30% cut)
 * Apple Rule 3.1.3  — EXEMPT: "goods and services consumed in the real world"
 *                     → The $50 date hold qualifies (real restaurant, real transport)
 *                     → A recurring app subscription does NOT qualify
 *
 * Architecture decision:
 *   - $50 hold         → Stripe (exempt, real-world service)     ✓
 *   - Add-on floristry → Stripe (exempt, physical goods)         ✓
 *   - App membership/subscription → must use Apple IAP on iOS    ⚠
 *   - Joining fee      → web-only checkout, never inside iOS app ✓
 *
 * Implementation: we route subscription/joining fees to a web checkout
 * when running on iOS. This is the same approach used by Spotify, Netflix,
 * and Airbnb — the App Store allows it as long as we do NOT direct users
 * to external checkout from within the app (no "subscribe on our website" links).
 */

import { Platform, Linking } from 'react-native';

// ── Types ─────────────────────────────────────────────────────────────────

export type PaymentRoute = 'stripe' | 'apple_iap' | 'web_only';

export interface PaymentItem {
  id: string;
  label: string;
  amountCents: number;
  route: PaymentRoute;
}

// ── Payment routing table ──────────────────────────────────────────────────

/** All payment items and their compliant route for each platform. */
export const PAYMENT_ITEMS: Record<string, PaymentItem> = {
  date_hold: {
    id:           'date_hold',
    label:        '$50 Commitment Hold',
    amountCents:  5000,
    route:        'stripe',   // ✓ Real-world service — IAP exempt
  },
  lyft_transport: {
    id:           'lyft_transport',
    label:        'Lyft Ride',
    amountCents:  0,          // Variable; pass-through partner cost
    route:        'stripe',   // ✓ Physical transport — IAP exempt
  },
  open_table_booking: {
    id:           'open_table_booking',
    label:        'Restaurant Reservation',
    amountCents:  0,          // Included in experience cost
    route:        'stripe',   // ✓ Real-world dining — IAP exempt
  },
  flower_add_on: {
    id:           'flower_add_on',
    label:        'Floristry',
    amountCents:  8500,
    route:        'stripe',   // ✓ Physical goods — IAP exempt
  },
  photo_add_on: {
    id:           'photo_add_on',
    label:        'Memory Photography',
    amountCents:  12000,
    route:        'stripe',   // ✓ Physical service — IAP exempt
  },
  // ⚠ Membership subscription — platform-dependent routing
  membership_monthly: {
    id:           'membership_monthly',
    label:        'Table for Two Membership',
    amountCents:  2999,
    route:        'apple_iap', // → overridden per platform below
  },
};

// ── Route resolver ─────────────────────────────────────────────────────────

/**
 * Returns the correct payment route for the current platform.
 * On iOS, membership/subscriptions must go through Apple IAP.
 * On web/Android, Stripe handles everything.
 */
export function resolvePaymentRoute(itemId: keyof typeof PAYMENT_ITEMS): PaymentRoute {
  const item = PAYMENT_ITEMS[itemId];
  if (!item) return 'stripe';

  if (Platform.OS === 'ios' && item.route === 'apple_iap') {
    return 'apple_iap';
  }

  // Web and Android can always use Stripe
  if (item.route === 'apple_iap') return 'stripe';

  return item.route;
}

/**
 * Returns true if this item requires Apple IAP on the current device.
 * Use to show/hide subscription UI elements conditionally.
 */
export function requiresAppleIAP(itemId: keyof typeof PAYMENT_ITEMS): boolean {
  return resolvePaymentRoute(itemId) === 'apple_iap';
}

// ── Apple IAP product IDs (StoreKit) ──────────────────────────────────────

/** Map our item IDs to App Store Connect product identifiers. */
export const APPLE_IAP_PRODUCTS: Partial<Record<keyof typeof PAYMENT_ITEMS, string>> = {
  membership_monthly: 'com.tablefortwo.membership.monthly',
};

// ── Compliance guard: no external payment links on iOS ────────────────────

/**
 * Apple 3.1.3(b): Apps must NOT include buttons, external links, or other
 * calls to action that direct customers to purchase methods other than IAP.
 *
 * Use this to conditionally render external purchase links.
 */
export function canShowExternalPaymentLink(): boolean {
  return Platform.OS !== 'ios';
}

// ── Deep-link to web membership page (Android/web only) ──────────────────

const MEMBERSHIP_URL = 'https://table-for-two-sigma.vercel.app/membership';

export async function openWebMembership(): Promise<void> {
  if (Platform.OS === 'ios') {
    // Do not open external URLs for purchase on iOS — use Apple IAP instead
    console.warn('[T42] openWebMembership blocked on iOS — use Apple IAP');
    return;
  }
  const supported = await Linking.canOpenURL(MEMBERSHIP_URL);
  if (supported) {
    await Linking.openURL(MEMBERSHIP_URL);
  }
}

// ── Disclosure copy (App Store required text) ─────────────────────────────

export const IAP_DISCLOSURE = {
  membership:
    'Membership auto-renews monthly at $29.99. Cancel anytime in your Apple ID settings. ' +
    'Payment is charged to your Apple ID account. Terms: tablefortwo.com/terms',
  trial:
    'Free trial converts to $29.99/month after 7 days. Cancel before trial ends to avoid charges.',
} as const;
