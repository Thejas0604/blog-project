const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cookieParser = require('cookie-parser');

const secret = process.env.JWT_SECRET;
if (!secret) throw new Error('JWT_SECRET is not set');
if (process.env.NODE_ENV === 'production' && secret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production');
}

const app = express();
app.set('trust proxy', 1); // Caddy is the one proxy

if (process.env.NODE_ENV !== 'production') {
  const cors = require('cors');
  app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
}

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/v1/user', require('./routes/user'));
app.use('/api/v1/posts', require('./routes/posts'));
app.use('/api/v1/category', require('./routes/categories'));
app.use('/api/v1/uploads', require('./routes/uploads'));

// Unknown /api routes: JSON 404. Must stay before the SPA fallback below.
app.use('/api', (req, res, next) => next(Object.assign(new Error('Not found'), { status: 404 })));

// Uploaded images. Before the SPA fallback so a missing file is a JSON 404.
app.use(
  '/uploads',
  (req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Content-Security-Policy', "default-src 'none'; img-src 'self'; sandbox");
    next();
  },
  express.static(require('./uploadDir'), {
    index: false,
    dotfiles: 'deny',
    redirect: false,
    fallthrough: false,
    maxAge: '365d',
    immutable: true,
  })
);

// Built frontend (copied to public/ in the Docker image). Absent in dev: skip.
const publicDir = path.join(__dirname, '..', 'public');
const indexHtml = path.join(publicDir, 'index.html');
if (fs.existsSync(indexHtml)) {
  app.use(express.static(publicDir));
  app.get('*', (req, res) => res.sendFile(indexHtml));
}

// Anything else: JSON 404.
app.use((req, res, next) => next(Object.assign(new Error('Not found'), { status: 404 })));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
  if (status === 500) console.error(err);
  let message = err.message;
  if (status === 500) message = 'Internal server error';
  else if (status === 404 && req.originalUrl.startsWith('/uploads')) message = 'Not found'; // no filesystem paths
  else if (err.type === 'entity.too.large' && req.originalUrl.startsWith('/api/v1/uploads')) message = 'Image too large (max 5 MB)';
  else if (err.type === 'entity.parse.failed') message = 'Invalid JSON body';
  res.status(status).json({ status: 'fail', message });
});

module.exports = app;
