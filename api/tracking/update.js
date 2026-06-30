/**
 * Phase 5 — POST /api/tracking/update
 *
 * Stores one GPS coordinate update during an active date window.
 *
 * ── Architecture ─────────────────────────────────────────────────────────────
 *
 * On Vercel (serverless), true WebSockets are not available. We use:
 *
 *   WRITE path: POST /api/tracking/update  (React Native calls every 30s)
 *   READ path:  GET  /api/tracking/stream  (SSE — partner polls latest location)
 *
 * For production push-based real-time, replace the SSE stream endpoint with
 * Pusher Channels:
 *   pusher.trigger(`commitment-${commitmentId}`, 'location', payload)
 *
 * ── Privacy ──────────────────────────────────────────────────────────────────
 * Live locations are ONLY stored during an active DATE_ACTIVE commitment.
 * `purgeAfter` is set to 24h after dateWindowEnd.
 * A daily Vercel cron job at /api/cron/purge-locations deletes expired records.
 *
 * Body:
 *   { commitmentId: string, latitude: number, longitude: number, accuracyM?: number }
 */

const prisma = require('../_lib/prisma');
const { requireAuth } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const userId = requireAuth(req, res);
  if (!userId) return;

  const { commitmentId, latitude, longitude, accuracyM } = req.body || {};

  if (!commitmentId || typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).json({ error: 'commitmentId, latitude, and longitude required' });
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: 'Invalid GPS coordinates' });
  }

  const commitment = await prisma.dateCommitment.findUnique({
    where: { id: commitmentId },
    select: { user1Id: true, user2Id: true, status: true, dateWindowEnd: true },
  });

  if (!commitment) return res.status(404).json({ error: 'Commitment not found' });

  const isParty = commitment.user1Id === userId || commitment.user2Id === userId;
  if (!isParty) return res.status(403).json({ error: 'Access denied' });

  if (commitment.status !== 'DATE_ACTIVE') {
    return res.status(409).json({
      error: 'Location tracking is only active during an active date window',
      status: commitment.status,
    });
  }

  const purgeAfter = commitment.dateWindowEnd
    ? new Date(new Date(commitment.dateWindowEnd).getTime() + 24 * 60 * 60 * 1000)
    : new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.liveLocation.create({
    data: { userId, commitmentId, latitude, longitude, accuracyM, purgeAfter },
  });

  // ── Optional: Push to Pusher for real-time partner awareness ─────────────
  // const Pusher = require('pusher');
  // const pusher = new Pusher({ appId: ..., key: ..., secret: ..., cluster: ... });
  // await pusher.trigger(`commitment-${commitmentId}`, 'location-update', {
  //   userId, latitude, longitude, accuracyM, timestamp: new Date().toISOString(),
  // });

  return res.status(200).json({ success: true });
};
