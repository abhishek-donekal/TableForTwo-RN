/**
 * Minimal JWT session middleware for Vercel serverless functions.
 * Usage:  const userId = requireAuth(req, res);
 *         if (!userId) return; // response already sent
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET env var not set');

/**
 * Extracts and verifies the Bearer token from the Authorization header.
 * Returns the authenticated userId string, or sends 401 and returns null.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {string|null}
 */
function requireAuth(req, res) {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Unauthorized — token missing' });
    return null;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload.sub; // userId stored in `sub` claim
  } catch {
    res.status(401).json({ error: 'Unauthorized — invalid token' });
    return null;
  }
}

/**
 * Issues a signed JWT for a given userId.
 * Call this after successful login / onboarding completion.
 */
function issueToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '30d' });
}

module.exports = { requireAuth, issueToken };
