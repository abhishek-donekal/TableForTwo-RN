/**
 * Stripe client — single instance, used across all API routes.
 * Stripe SDK is safe to reuse across serverless invocations.
 */
const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is not set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  appInfo: {
    name: 'Table for Two',
    version: '1.0.0',
  },
});

module.exports = stripe;
