const jwt = require('jsonwebtoken');
const db = require('../db');
const { isDevLike } = require('../env');

const COOKIE_NAME = 'token';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: !isDevLike(),
  path: '/',
});

const fail = (status, message) => Object.assign(new Error(message), { status });

const signToken = (userId, tokenVersion) =>
  jwt.sign({ sub: String(userId), tv: tokenVersion }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '7d',
  });

const setAuthCookie = (res, user) =>
  res.cookie(COOKIE_NAME, signToken(user.id, user.token_version), { ...cookieOptions(), maxAge: MAX_AGE_MS });

const clearAuthCookie = (res) => res.clearCookie(COOKIE_NAME, cookieOptions());

const findUser = db.prepare('SELECT id, username, role, token_version FROM users WHERE id = ?');

// Returns the user for a valid cookie whose token version is current, else null.
function userFromCookie(req) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return null;
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return null;
  }
  const id = Number(payload.sub);
  const user = Number.isSafeInteger(id) ? findUser.get(id) : undefined;
  if (!user || payload.tv !== user.token_version) return null;
  return user;
}

function requireAuth(req, res, next) {
  const user = userFromCookie(req);
  if (!user) return next(fail(401, 'Not authenticated'));
  req.user = user;
  next();
}

// Use after requireAuth.
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return next(fail(403, 'Forbidden'));
  next();
}

module.exports = { requireAuth, requireAdmin, userFromCookie, setAuthCookie, clearAuthCookie, fail };
