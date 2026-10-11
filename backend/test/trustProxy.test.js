const test = require('node:test');
const assert = require('node:assert');
require('./helpers');
process.env.TRUST_PROXY = '0';
const app = require('../src/app');
const request = require('supertest')(app);

test('TRUST_PROXY=0 is parsed as a number and X-Forwarded-For is ignored', async () => {
  assert.strictEqual(app.get('trust proxy'), 0);
  // With no trusted proxy every request comes from the socket address, so one
  // spoofed header per request does not give a fresh limiter bucket.
  const bad = (ip) =>
    request.post('/api/v1/user/login').set('X-Forwarded-For', ip).send({ username: 'x', password: 5 });
  for (let i = 0; i < 10; i++) assert.strictEqual((await bad(`203.0.113.${i + 1}`)).status, 401);
  assert.strictEqual((await bad('203.0.113.200')).status, 429);
});

test('TRUST_PROXY accepts a subnet string', () => {
  const { spawnSync } = require('child_process');
  const code = "console.log(require('./src/app').get('trust proxy'))";
  const res = spawnSync(process.execPath, ['-e', code], {
    cwd: require('path').join(__dirname, '..'),
    env: { PATH: process.env.PATH, NODE_ENV: 'test', JWT_SECRET: 'x', DB_PATH: ':memory:', TRUST_PROXY: '172.18.0.0/16' },
    encoding: 'utf8',
  });
  assert.strictEqual(res.stdout.trim().split('\n').pop(), '172.18.0.0/16', res.stderr);
});
