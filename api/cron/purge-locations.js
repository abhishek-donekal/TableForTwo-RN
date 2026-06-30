/**
 * GET /api/cron/purge-locations
 *
 * Vercel cron job — runs daily at 03:00 UTC.
 * Deletes LiveLocation records that have passed their purgeAfter timestamp.
 *
 * Registered in vercel.json under "crons":
 *   { "path": "/api/cron/purge-locations", "schedule": "0 3 * * *" }
 *
 * This enforces our privacy promise: GPS data is never stored longer than
 * 24h after the date window closes.
 */

const prisma = require('../_lib/prisma');

module.exports = async function handler(req, res) {
  // Vercel cron jobs call with GET; verify the cron secret header
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end();
  }

  const { count } = await prisma.liveLocation.deleteMany({
    where: { purgeAfter: { lte: new Date() } },
  });

  console.log(`[cron/purge-locations] Deleted ${count} expired location records`);
  return res.status(200).json({ purged: count, timestamp: new Date().toISOString() });
};
