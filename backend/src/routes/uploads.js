const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const uploadDir = require('../uploadDir');
const { requireAuth, requireAdmin, fail } = require('../middleware/auth');

const router = express.Router();

const TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

// Detect the real type from magic bytes. Returns { mime, ext } or null.
function sniff(buf) {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mime: 'image/png', ext: '.png' };
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mime: 'image/jpeg', ext: '.jpg' };
  }
  if (buf.length >= 6 && /^GIF8[79]a$/.test(buf.toString('latin1', 0, 6))) {
    return { mime: 'image/gif', ext: '.gif' };
  }
  if (buf.length >= 12 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') {
    return { mime: 'image/webp', ext: '.webp' };
  }
  return null;
}

router.post(
  '/',
  requireAuth,
  requireAdmin,
  express.raw({ type: TYPES, limit: '5mb' }),
  (req, res, next) => {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return next(fail(415, 'Upload a PNG, JPEG, GIF or WebP image as the raw request body'));
    }
    const kind = sniff(req.body);
    if (!kind || kind.mime !== req.get('content-type').split(';')[0].trim().toLowerCase()) {
      return next(fail(415, 'File content does not match an allowed image type'));
    }
    const name = crypto.randomUUID() + kind.ext;
    fs.writeFile(path.join(uploadDir, name), req.body, { flag: 'wx' }, (err) => {
      if (err) return next(err);
      res.status(201).json({ status: 'success', message: 'Image uploaded', url: `/uploads/${name}`, name });
    });
  }
);

module.exports = router;
