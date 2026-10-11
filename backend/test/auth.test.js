const test = require('node:test');
const assert = require('node:assert');
const { db, addUser, login } = require('./helpers');
const request = require('supertest')(require('../src/app'));

const PW = 'correct-horse-battery';
addUser('admin', PW, 'admin');
addUser('editor', PW, 'editor');

test('requireAdmin: admin can write, other roles get 403, anonymous gets 401', async () => {
  const body = { categoryName: 'Cat A' };
  const adminCookie = await login(request, 'admin', PW);
  const editorCookie = await login(request, 'editor', PW);

  assert.strictEqual((await request.post('/api/v1/category/create').send(body)).status, 401);
  assert.strictEqual((await request.post('/api/v1/category/create').set('Cookie', editorCookie).send(body)).status, 403);
  assert.strictEqual((await request.post('/api/v1/category/create').set('Cookie', adminCookie).send(body)).status, 201);

  assert.strictEqual(
    (await request.post('/api/v1/posts/create').set('Cookie', editorCookie).send({ title: 't', content: 'c' })).status,
    403
  );
  assert.strictEqual((await request.delete('/api/v1/posts/1').set('Cookie', editorCookie)).status, 403);
  assert.strictEqual((await request.delete('/api/v1/category/1').set('Cookie', editorCookie)).status, 403);
  assert.strictEqual(
    (await request.post('/api/v1/uploads').set('Cookie', editorCookie).set('Content-Type', 'image/png').send(Buffer.from([1]))).status,
    403
  );
  // Reads stay public.
  assert.strictEqual((await request.get('/api/v1/category')).status, 200);
});

test('logout revokes previously issued tokens (token_version)', async () => {
  const cookie = await login(request, 'admin', PW);
  assert.strictEqual((await request.get('/api/v1/user/profile').set('Cookie', cookie)).status, 200);

  const out = await request.post('/api/v1/user/logout').set('Cookie', cookie).send({});
  assert.strictEqual(out.status, 200);
  assert.match(out.headers['set-cookie'][0], /^token=;/);

  // The old (stolen) cookie no longer works.
  assert.strictEqual((await request.get('/api/v1/user/profile').set('Cookie', cookie)).status, 401);
  // A fresh login works again.
  const again = await login(request, 'admin', PW);
  assert.strictEqual((await request.get('/api/v1/user/profile').set('Cookie', again)).status, 200);
});

test('logout without a valid cookie still clears and returns 200', async () => {
  const sum = () => db.prepare('SELECT SUM(token_version) AS s FROM users').get().s;
  const before = sum();
  assert.strictEqual((await request.post('/api/v1/user/logout').send({})).status, 200);
  assert.strictEqual((await request.post('/api/v1/user/logout').set('Cookie', 'token=garbage').send({})).status, 200);
  assert.strictEqual(sum(), before);
});

test('logout requires application/json', async () => {
  const res = await request.post('/api/v1/user/logout').set('Content-Type', 'text/plain').send('x');
  assert.strictEqual(res.status, 415);
});

test('token without tv claim is rejected', async () => {
  const jwt = require('jsonwebtoken');
  const id = db.prepare("SELECT id FROM users WHERE username = 'admin'").get().id;
  const token = jwt.sign({ sub: String(id) }, process.env.JWT_SECRET, { algorithm: 'HS256' });
  assert.strictEqual((await request.get('/api/v1/user/profile').set('Cookie', `token=${token}`)).status, 401);
});

test('security headers on app responses, /uploads keeps its own CSP', async () => {
  const res = await request.get('/health');
  assert.strictEqual(res.headers['x-powered-by'], undefined);
  assert.match(res.headers['content-security-policy'], /frame-ancestors 'none'/);
  for (const d of ["base-uri 'self'", "form-action 'self'", "object-src 'none'"]) {
    assert.ok(res.headers['content-security-policy'].includes(d), d);
  }
  assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
  assert.strictEqual(res.headers['x-frame-options'], 'DENY');
  assert.ok(res.headers['referrer-policy']);
  const up = await request.get('/uploads/missing.png');
  assert.strictEqual(up.headers['content-security-policy'], "default-src 'none'; img-src 'self'; sandbox");
});

test('cookie is not Secure in test env', async () => {
  const res = await request.post('/api/v1/user/login').send({ username: 'admin', password: PW });
  assert.doesNotMatch(res.headers['set-cookie'][0], /Secure/);
});

test('cookie is Secure when NODE_ENV is production', async () => {
  process.env.NODE_ENV = 'production';
  try {
    const res = await request.post('/api/v1/user/login').send({ username: 'admin', password: PW });
    assert.strictEqual(res.status, 200);
    assert.match(res.headers['set-cookie'][0], /; Secure/);
    assert.match(res.headers['set-cookie'][0], /HttpOnly/);
  } finally {
    process.env.NODE_ENV = 'test';
  }
});
