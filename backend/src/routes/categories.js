const express = require('express');
const db = require('../db');
const serialize = require('../serialize');
const { requireAuth, fail } = require('../middleware/auth');
const { requireJson, parseId } = require('../middleware/http');

const router = express.Router();

const SELECT = `SELECT c.id, c.name, c.description,
  (SELECT COUNT(*) FROM posts p WHERE p.category_id = c.id) AS post_count
  FROM categories c`;

const listAll = db.prepare(`${SELECT} ORDER BY c.name`);
const getOne = db.prepare(`${SELECT} WHERE c.id = ?`);
const insert = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)');
const update = db.prepare('UPDATE categories SET name = ?, description = ? WHERE id = ?');
const remove = db.prepare('DELETE FROM categories WHERE id = ?');

// On update, absent fields keep their stored value.
function readInput(body, existing) {
  const b = body || {};
  let name = existing ? existing.name : undefined;
  let description = existing ? existing.description : null;

  if (b.categoryName !== undefined || !existing) {
    if (typeof b.categoryName !== 'string' || !b.categoryName.trim() || b.categoryName.trim().length > 100) {
      throw fail(400, 'categoryName is required (1 to 100 characters)');
    }
    name = b.categoryName.trim();
  }
  if (b.categoryDescription !== undefined) {
    const d = b.categoryDescription;
    if (d !== null && (typeof d !== 'string' || d.length > 1000)) {
      throw fail(400, 'categoryDescription must be a string up to 1000 characters');
    }
    description = d;
  }
  return { name, description };
}

function run(fn) {
  try {
    return fn();
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') throw fail(400, 'Category already exists');
    throw err;
  }
}

function loadOr404(req) {
  const id = parseId(req.params.id);
  const row = id && getOne.get(id);
  if (!row) throw fail(404, 'Category not found');
  return row;
}

router.get('/', (req, res) => {
  res.json({ status: 'success', categories: listAll.all().map(serialize.category) });
});

router.get('/:id', (req, res) => {
  const row = loadOr404(req);
  res.json({ status: 'success', message: 'Category fetched', categoryFound: serialize.category(row) });
});

router.post('/create', requireAuth, requireJson, (req, res) => {
  const { name, description } = readInput(req.body, null);
  const info = run(() => insert.run(name, description ?? null));
  const row = getOne.get(info.lastInsertRowid);
  res.status(201).json({ status: 'success', message: 'Category created', categoryCreated: serialize.category(row) });
});

router.put('/:id', requireAuth, requireJson, (req, res) => {
  const existing = loadOr404(req);
  const { name, description } = readInput(req.body, existing);
  run(() => update.run(name, description, existing.id));
  res.json({
    status: 'success',
    message: 'Category updated',
    categoryUpdated: serialize.category(getOne.get(existing.id)),
  });
});

router.delete('/:id', requireAuth, (req, res) => {
  const existing = loadOr404(req);
  remove.run(existing.id); // posts survive: the FK is ON DELETE SET NULL
  res.json({ status: 'success', message: 'Category deleted', deletedCategory: serialize.category(existing) });
});

module.exports = router;
