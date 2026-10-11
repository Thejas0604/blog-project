// Online backup via better-sqlite3 db.backup(); keeps the newest 14 files.
const fs = require('fs');
const path = require('path');
const db = require('../db');

const KEEP = 14;
const dir = path.join(path.dirname(db.name), 'backups');
fs.mkdirSync(dir, { recursive: true, mode: 0o700 });

const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
const file = path.join(dir, `blog-${stamp}.db`);
const tmp = `${file}.tmp`;

// Write to a temp file (created 0600; a umask can only tighten it) and rename on success,
// so a failed backup never leaves a partial blog-*.db behind.
fs.closeSync(fs.openSync(tmp, 'w', 0o600));

db.backup(tmp)
  .then(() => {
    fs.chmodSync(tmp, 0o600);
    fs.renameSync(tmp, file);
    console.log(`Backup written: ${file}`);
    // Retention ignores temp files and zero-size files.
    const old = fs
      .readdirSync(dir)
      .filter((f) => /^blog-.*\.db$/.test(f) && fs.statSync(path.join(dir, f)).size > 0)
      .sort()
      .reverse()
      .slice(KEEP);
    for (const f of old) fs.unlinkSync(path.join(dir, f));
  })
  .catch((err) => {
    fs.rmSync(tmp, { force: true });
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => db.close());
