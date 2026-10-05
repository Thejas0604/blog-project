const { fail } = require('./auth');

// Writes accept only application/json.
function requireJson(req, res, next) {
  if (!req.is('application/json')) {
    return next(fail(415, 'Content-Type must be application/json'));
  }
  next();
}

// Ids in URLs must be positive integers; anything else is a 404.
function parseId(raw) {
  if (!/^\d{1,15}$/.test(raw)) return null;
  const n = Number(raw);
  return n > 0 ? n : null;
}

module.exports = { requireJson, parseId };
