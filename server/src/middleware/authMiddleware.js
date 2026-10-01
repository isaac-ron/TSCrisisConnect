import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { JWT_SECRET } from '../config.js';
import { logger } from '../logger.js';

const log = logger.child({ module: 'auth' });

const USER_FIELDS = { id: true, email: true, name: true, role: true, badgeId: true };

/**
 * Resolves the user for a "Bearer <token>" header.
 * @returns {Promise<{user: object|null, error: string|null}>} error is null when no token was sent
 */
async function userFromHeader(header) {
  if (!header?.startsWith('Bearer ')) {
    return { user: null, error: null };
  }
  let decoded;
  try {
    decoded = jwt.verify(header.substring(7), JWT_SECRET);
  } catch (err) {
    return { user: null, error: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token' };
  }
  const user = await prisma.user.findUnique({ where: { id: decoded.userId }, select: USER_FIELDS });
  return user ? { user, error: null } : { user: null, error: 'User not found' };
}

/** Requires a valid token; attaches the user to req.user. */
export const authenticate = async (req, res, next) => {
  try {
    const { user, error } = await userFromHeader(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: error || 'No token provided' });
    }
    req.user = user;
    next();
  } catch (err) {
    log.error({ err }, 'authentication failed');
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/** Must be used after authenticate. */
export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

/** Attaches the user when a valid token is sent; otherwise continues anonymously. */
export const optionalAuth = async (req, res, next) => {
  try {
    const { user, error } = await userFromHeader(req.headers.authorization);
    if (user) req.user = user;
    else if (error) log.debug({ reason: error }, 'optional auth: continuing anonymously');
  } catch (err) {
    log.error({ err }, 'optional authentication failed');
  }
  next();
};
