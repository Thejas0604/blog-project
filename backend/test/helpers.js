// Must be required before src/app.js: configures an in-memory DB and test env.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-that-is-long-enough-1234567890';
process.env.DB_PATH = ':memory:';
delete process.env.UPLOAD_DIR;
delete process.env.TRUST_PROXY;

const bcrypt = require('bcryptjs');
const db = require('../src/db');

function addUser(username, password, role = 'admin') {
  const hash = bcrypt.hashSync(password, 4);
  return db
    .prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)')
    .run(username, hash, role).lastInsertRowid;
}

// Logs in with supertest and returns the Cookie header value.
async function login(request, username, password) {
  const res = await request.post('/api/v1/user/login').send({ username, password });
  if (res.status !== 200) throw new Error(`login failed: ${res.status}`);
  return res.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ');
}

module.exports = { db, addUser, login };
