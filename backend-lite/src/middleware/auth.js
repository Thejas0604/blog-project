const jwt = require('jsonwebtoken');
const db = require('../db');

const COOKIE_NAME = 'token';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
});

const fail = (status, message) => Object.assign(new Error(message), { status });

const signToken = (userId) =>
  jwt.sign({ sub: String(userId) }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '7d',
  });

const setAuthCookie = (res, userId) =>
  res.cookie(COOKIE_NAME, signToken(userId), { ...cookieOptions(), maxAge: MAX_AGE_MS });

const clearAuthCookie = (res) => res.clearCookie(COOKIE_NAME, cookieOptions());

const findUser = db.prepare('SELECT id, username, role FROM users WHERE id = ?');

function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return next(fail(401, 'Not authenticated'));
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return next(fail(401, 'Not authenticated'));
  }
  const id = Number(payload.sub);
  const user = Number.isSafeInteger(id) ? findUser.get(id) : undefined;
  if (!user) return next(fail(401, 'Not authenticated'));
  req.user = user;
  next();
}

module.exports = { requireAuth, setAuthCookie, clearAuthCookie, fail };
