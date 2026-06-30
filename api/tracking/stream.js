/**
 * Phase 5b — GET /api/tracking/stream?commitmentId=xxx
 *
 * Server-Sent Events (SSE) endpoint.
 * The mobile app polls this endpoint to receive the partner's latest location.
 *
 * SSE is stateless and compatible with Vercel serverless functions.
 * Each connection polls the DB every 15s and pushes the latest location record.
 *
 * For true real-time, plug in Pusher Channels (see /api/tracking/update.js).
 */

const prisma = require('../_lib/prisma');
const { requireAuth } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const userId = requireAuth(req, res);
  if (!userId) return;

  const { commitmentId } = req.query;
  if (!commitmentId) return res.status(400).json({ error: 'commitmentId required' });

  const commitment = await prisma.dateCommitment.findUnique({
    where: { id: commitmentId },
    select: { user1Id: true, user2Id: true, status: true },
  });

  if (!commitment) return res.status(404).end();

  const isParty = commitment.user1Id === userId || commitment.user2Id === userId;
  if (!isParty) return res.status(403).end();

  if (commitment.status !== 'DATE_ACTIVE') {
    return res.status(200).json({ status: commitment.status, location: null });
  }

  // Determine partner's userId
  const partnerId = commitment.user1Id === userId
    ? commitment.user2Id
    : commitment.user1Id;

  // Set SSE headers
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering

  const send = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  send({ type: 'connected', commitmentId });

  const interval = setInterval(async () => {
    try {
      const latest = await prisma.liveLocation.findFirst({
        where:   { userId: partnerId, commitmentId },
        orderBy: { createdAt: 'desc' },
        select:  { latitude: true, longitude: true, accuracyM: true, createdAt: true },
      });

      send({
        type:      'location',
        partnerId,
        location:  latest,
        timestamp: new Date().toISOString(),
      });
    } catch {
      send({ type: 'error', message: 'Location unavailable' });
    }
  }, 15_000); // Poll every 15 seconds

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
};
