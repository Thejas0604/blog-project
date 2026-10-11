const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const serialize = require('../serialize');
const { requireAuth, userFromCookie, setAuthCookie, clearAuthCookie, fail } = require('../middleware/auth');
const { requireJson } = require('../middleware/http');

const router = express.Router();

// Login rate limit: failed attempts per client, in memory. IPv6 clients are keyed
// on their /64 prefix (one subscriber usually owns a whole /64).
const MAX_FAILS = 10;
const MAX_GLOBAL_FAILS = 100; // all clients together; blocks logins until the window ends
const WINDOW_MS = 15 * 60 * 1000;
const fails = new Map(); // key -> { count, resetAt }
const globalFails = { count: 0, resetAt: 0 };
// Clients that logged in successfully recently are exempt from the global cap (so an
// anonymous attacker cannot lock the real admin out); the per-client cap still applies.
// In memory only: the exemption is lost on restart.
const KNOWN_GOOD_MS = 24 * 60 * 60 * 1000;
const knownGood = new Map(); // key -> time of last successful login

function clientKey(ip) {
  if (typeof ip !== 'string') return 'unknown';
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (mapped) return mapped[1];
  if (!ip.includes(':')) return ip;
  const [head, tail] = ip.split('%')[0].split('::');
  const left = head ? head.split(':') : [];
  const right = tail ? tail.split(':') : [];
  const groups = tail === undefined ? left : [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill('0'), ...right];
  return groups.slice(0, 4).map((g) => parseInt(g || '0', 16).toString(16)).join(':') + '::/64';
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of fails) if (rec.resetAt <= now) fails.delete(ip);
  for (const [key, at] of knownGood) if (now - at >= KNOWN_GOOD_MS) knownGood.delete(key);
}, WINDOW_MS).unref();

const isLimited = (ip) => {
  const now = Date.now();
  const key = clientKey(ip);
  const good = knownGood.get(key);
  const exempt = good !== undefined && now - good < KNOWN_GOOD_MS;
  if (!exempt && globalFails.resetAt > now && globalFails.count >= MAX_GLOBAL_FAILS) return true;
  const rec = fails.get(key);
  return !!rec && rec.resetAt > now && rec.count >= MAX_FAILS;
};
const recordFail = (ip) => {
  const now = Date.now();
  if (globalFails.resetAt <= now) Object.assign(globalFails, { count: 1, resetAt: now + WINDOW_MS });
  else globalFails.count += 1;
  const key = clientKey(ip);
  const rec = fails.get(key);
  if (!rec || rec.resetAt <= now) fails.set(key, { count: 1, resetAt: now + WINDOW_MS });
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
  fails.delete(clientKey(req.ip));
  knownGood.set(clientKey(req.ip), Date.now());
  setAuthCookie(res, row);
  res.json({ status: 'success', message: 'Login successful', user: serialize.user(row) });
});

// Logging out revokes every token issued so far for the user (token_version bump).
const bumpTokenVersion = db.prepare('UPDATE users SET token_version = token_version + 1 WHERE id = ?');

router.post('/logout', requireJson, (req, res) => {
  const user = userFromCookie(req);
  if (user) bumpTokenVersion.run(user.id);
  clearAuthCookie(res);
  res.json({ status: 'success', message: 'Logged out' });
});

router.get('/profile', requireAuth, (req, res) => {
  res.json({ status: 'success', user: serialize.user(req.user) });
});

module.exports = router;
