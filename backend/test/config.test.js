const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SRC = path.join(__dirname, '..', 'src');
const run = (code, env) =>
  spawnSync(process.execPath, ['-e', code], {
    env: { PATH: process.env.PATH, DB_PATH: ':memory:', ...env },
    encoding: 'utf8',
  });

test('JWT_SECRET checks apply unless NODE_ENV is development or test', () => {
  const load = `require(${JSON.stringify(path.join(SRC, 'app.js'))})`;
  const good = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4';
  assert.strictEqual(run(load, { NODE_ENV: 'production', JWT_SECRET: good }).status, 0);
  assert.strictEqual(run(load, { NODE_ENV: '', JWT_SECRET: good }).status, 0); // empty NODE_ENV, good secret
  assert.notStrictEqual(run(load, { NODE_ENV: 'production', JWT_SECRET: 'short' }).status, 0);
  assert.notStrictEqual(run(load, { NODE_ENV: '', JWT_SECRET: 'short' }).status, 0); // empty NODE_ENV = production rules
  assert.notStrictEqual(run(load, { NODE_ENV: 'staging', JWT_SECRET: 'short' }).status, 0);
  const placeholder = 'change-me-change-me-change-me-change-me-1234';
  assert.notStrictEqual(run(load, { NODE_ENV: 'production', JWT_SECRET: placeholder }).status, 0);
  const lowEntropy = 'abababababababababababababababababababab'; // 40 chars, 2 distinct
  assert.notStrictEqual(run(load, { NODE_ENV: 'production', JWT_SECRET: lowEntropy }).status, 0);
  assert.strictEqual(run(load, { NODE_ENV: 'development', JWT_SECRET: 'short' }).status, 0);
  assert.strictEqual(run(load, { NODE_ENV: 'test', JWT_SECRET: placeholder }).status, 0);
});

test('migration adds token_version to an old users table', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blogme-mig-'));
  const dbFile = path.join(dir, 'old.db');
  const Database = require('better-sqlite3');
  const old = new Database(dbFile);
  old.exec(
    "CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, email TEXT, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'admin', created_at TEXT NOT NULL DEFAULT 'x'); INSERT INTO users (username, password_hash) VALUES ('a','h');"
  );
  old.close();
  const code = `const db=require(${JSON.stringify(path.join(SRC, 'db.js'))});console.log(db.prepare('SELECT token_version AS v FROM users').get().v)`;
  const res = run(code, { DB_PATH: dbFile });
  assert.strictEqual(res.stdout.trim().split('\n').pop(), '0', res.stderr);
  assert.strictEqual(run(code, { DB_PATH: dbFile }).status, 0); // idempotent
});

test('uploadDir refuses a dir that contains the DB file or its directory', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blogme-up-'));
  const dbDir = path.join(dir, 'data');
  const dbFile = path.join(dbDir, 'blog.db');
  const code = `console.log(require(${JSON.stringify(path.join(SRC, 'uploadDir.js'))}))`;
  const base = { NODE_ENV: 'test', DB_PATH: dbFile };

  assert.notStrictEqual(run(code, { ...base, UPLOAD_DIR: dbDir }).status, 0); // same dir as DB
  assert.notStrictEqual(run(code, { ...base, UPLOAD_DIR: dir }).status, 0); // ancestor of DB dir
  const ok = run(code, { ...base, UPLOAD_DIR: path.join(dir, 'uploads') });
  assert.strictEqual(ok.status, 0, ok.stderr);
  const sub = run(code, { ...base, UPLOAD_DIR: path.join(dbDir, 'uploads') });
  assert.strictEqual(sub.status, 0, sub.stderr); // subdirectory of the DB dir is fine
});

test('uploadDir refuses the backups directory and anything inside it', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blogme-bk-'));
  const dbDir = path.join(dir, 'data');
  const code = `console.log(require(${JSON.stringify(path.join(SRC, 'uploadDir.js'))}))`;
  const base = { NODE_ENV: 'test', DB_PATH: path.join(dbDir, 'blog.db') };
  assert.notStrictEqual(run(code, { ...base, UPLOAD_DIR: path.join(dbDir, 'backups') }).status, 0);
  assert.notStrictEqual(run(code, { ...base, UPLOAD_DIR: path.join(dbDir, 'backups', 'x') }).status, 0);
  const ok = run(code, { ...base, UPLOAD_DIR: path.join(dbDir, 'backups-not') });
  assert.strictEqual(ok.status, 0, ok.stderr);
});
