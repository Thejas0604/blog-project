const fs = require('fs');
const os = require('os');
const path = require('path');
const db = require('./db');

// UPLOAD_DIR (relative paths resolve against backend-lite/) or <DB dir>/uploads.
// With an in-memory DB and no UPLOAD_DIR, a fresh temp dir is used.
let dir;
if (process.env.UPLOAD_DIR) {
  dir = path.resolve(path.join(__dirname, '..'), process.env.UPLOAD_DIR);
} else if (db.name === ':memory:') {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blogme-uploads-'));
} else {
  dir = path.join(path.dirname(db.name), 'uploads');
}
fs.mkdirSync(dir, { recursive: true });

module.exports = dir;
