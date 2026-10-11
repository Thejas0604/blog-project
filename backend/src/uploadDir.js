const fs = require('fs');
const os = require('os');
const path = require('path');
const db = require('./db');

// UPLOAD_DIR (relative paths resolve against backend/) or <DB dir>/uploads.
// With an in-memory DB and no UPLOAD_DIR, a fresh temp dir is used.
let dir;
if (process.env.UPLOAD_DIR) {
  dir = path.resolve(path.join(__dirname, '..'), process.env.UPLOAD_DIR);
  // Uploads are served publicly: never let them overlap the database or its directory.
  if (db.name !== ':memory:') {
    const real = (p) => {
      try {
        return fs.realpathSync(p);
      } catch {
        return path.resolve(p);
      }
    };
    const inside = (parent, child) => {
      const rel = path.relative(parent, child);
      return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
    };
    const dbDir = real(path.dirname(db.name));
    if (inside(real(dir), dbDir)) {
      throw new Error('UPLOAD_DIR must not contain the database file or its directory');
    }
    // Backups are full database copies: never serve them either.
    if (inside(path.join(dbDir, 'backups'), real(dir))) {
      throw new Error('UPLOAD_DIR must not be the backups directory or inside it');
    }
  }
} else if (db.name === ':memory:') {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blogme-uploads-'));
} else {
  dir = path.join(path.dirname(db.name), 'uploads');
}
fs.mkdirSync(dir, { recursive: true });

module.exports = dir;
