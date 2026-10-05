const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const serialize = require('../serialize');
const { requireAuth, setAuthCookie, clearAuthCookie, fail } = require('../middleware/auth');
const { requireJson } = require('../middleware/http');

const router = express.Router();

// Login rate limit: failed attempts per IP, in memory.
const MAX_FAILS = 10;
const WINDOW_MS = 15 * 60 * 1000;
const fails = new Map(); // ip -> { count, resetAt }

setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of fails) if (rec.resetAt <= now) fails.delete(ip);
}, WINDOW_MS).unref();

const isLimited = (ip) => {
  const rec = fails.get(ip);
  return !!rec && rec.resetAt > Date.now() && rec.count >= MAX_FAILS;
};
const recordFail = (ip) => {
  const now = Date.now();
  const rec = fails.get(ip);
  if (!rec || rec.resetAt <= now) fails.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  else rec.count += 1;
};

// Compared against when the username does not exist, to keep timing similar.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

const findByUsername = db.prepare('SELECT * FROM users WHERE username = ?');

router.post('/login', requireJson, (req, res, next) => {
  if (isLimited(req.ip)) return next(fail(429, 'Too many attempts, try again later'));

  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    recordFail(req.ip);
    return next(fail(401, 'Invalid credentials'));
  }
  const row = findByUsername.get(username);
  const ok = bcrypt.compareSync(password, row ? row.password_hash : DUMMY_HASH);
  if (!row || !ok) {
    recordFail(req.ip);
    return next(fail(401, 'Invalid credentials'));
  }
  fails.delete(req.ip);
  setAuthCookie(res, row.id);
  res.json({ status: 'success', message: 'Login successful', user: serialize.user(row) });
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ status: 'success', message: 'Logged out' });
});

router.get('/profile', requireAuth, (req, res) => {
  res.json({ status: 'success', user: serialize.user(req.user) });
});

module.exports = router;
