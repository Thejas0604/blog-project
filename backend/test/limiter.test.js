const test = require('node:test');
const assert = require('node:assert');
const { addUser } = require('./helpers');
const request = require('supertest')(require('../src/app'));

addUser('admin', 'correct-horse-battery');
// A non-string password fails fast without running bcrypt.
const bad = (ip) =>
  request.post('/api/v1/user/login').set('X-Forwarded-For', ip).send({ username: 'admin', password: 5 });

test('per-IP limit honours X-Forwarded-For (trust proxy 1)', async () => {
  for (let i = 0; i < 10; i++) assert.strictEqual((await bad('203.0.113.7')).status, 401);
  assert.strictEqual((await bad('203.0.113.7')).status, 429);
  assert.strictEqual((await bad('203.0.113.8')).status, 401);
});

test('IPv6 clients share a bucket per /64', async () => {
  for (let i = 0; i < 10; i++) assert.strictEqual((await bad(`2001:db8:1:2::${i + 1}`)).status, 401);
  assert.strictEqual((await bad('2001:db8:1:2:aaaa:bbbb:cccc:dddd')).status, 429);
  assert.strictEqual((await bad('2001:db8:1:3::1')).status, 401);
});

// A fresh app instance (and so fresh limiter state), independent of the tests above.
function freshRequest() {
  delete require.cache[require.resolve('../src/routes/user')];
  delete require.cache[require.resolve('../src/app')];
  return require('supertest')(require('../src/app'));
}
const loginAs = (req, ip, password) =>
  req.post('/api/v1/user/login').set('X-Forwarded-For', ip).send({ username: 'admin', password });

test('global failed-login cap blocks unknown clients but not recent known-good ones', async () => {
  const req = freshRequest();
  assert.strictEqual((await loginAs(req, '192.0.2.50', 'correct-horse-battery')).status, 200); // known-good
  const badFrom = (ip) => req.post('/api/v1/user/login').set('X-Forwarded-For', ip).send({ username: 'admin', password: 5 });
  for (let i = 0; i < 100; i++) assert.strictEqual((await badFrom(`198.51.100.${i + 1}`)).status, 401);

  assert.strictEqual((await badFrom('198.51.100.200')).status, 429); // cap reached
  assert.strictEqual((await loginAs(req, '192.0.2.99', 'correct-horse-battery')).status, 429); // unknown client
  assert.strictEqual((await loginAs(req, '192.0.2.50', 'correct-horse-battery')).status, 200); // known-good client

  // The per-client cap still applies to a known-good client.
  for (let i = 0; i < 10; i++) assert.strictEqual((await badFrom('192.0.2.50')).status, 401);
  assert.strictEqual((await loginAs(req, '192.0.2.50', 'correct-horse-battery')).status, 429);
});
