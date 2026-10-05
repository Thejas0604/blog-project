// Online backup via better-sqlite3 db.backup(); keeps the newest 14 files.
const fs = require('fs');
const path = require('path');
const db = require('../db');

const KEEP = 14;
const dir = path.join(path.dirname(process.env.DB_PATH || './data/blog.db'), 'backups');
fs.mkdirSync(dir, { recursive: true });

const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
const file = path.join(dir, `blog-${stamp}.db`);

db.backup(file)
  .then(() => {
    console.log(`Backup written: ${file}`);
    const old = fs.readdirSync(dir).filter((f) => /^blog-.*\.db$/.test(f)).sort().reverse().slice(KEEP);
    for (const f of old) fs.unlinkSync(path.join(dir, f));
  })
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => db.close());
