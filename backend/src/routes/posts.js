const express = require('express');
const db = require('../db');
const serialize = require('../serialize');
const { requireAuth, requireAdmin, fail } = require('../middleware/auth');
const { requireJson, parseId } = require('../middleware/http');

const router = express.Router();

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";
const listAll = db.prepare('SELECT * FROM posts ORDER BY created_at DESC, id DESC');
const listByCategory = db.prepare('SELECT * FROM posts WHERE category_id = ? ORDER BY created_at DESC, id DESC');
const getOne = db.prepare('SELECT * FROM posts WHERE id = ?');
const categoryExists = db.prepare('SELECT 1 FROM categories WHERE id = ?');
const insert = db.prepare('INSERT INTO posts (title, content, category_id, author_id) VALUES (?, ?, ?, ?)');
const update = db.prepare(
  `UPDATE posts SET title = ?, content = ?, category_id = ?, updated_at = ${NOW} WHERE id = ?`
);
const remove = db.prepare('DELETE FROM posts WHERE id = ?');

// Returns an integer category id, or null. Throws 400 if invalid or unknown.
function parseCategory(value) {
  if (value === null || value === '') return null;
  const id = typeof value === 'string' || typeof value === 'number' ? parseId(String(value)) : null;
  if (!id || !categoryExists.get(id)) throw fail(400, 'category does not exist');
  return id;
}

function readInput(body) {
  const b = body || {};
  if (typeof b.title !== 'string' || !b.title.trim() || b.title.trim().length > 200) {
    throw fail(400, 'title is required (1 to 200 characters)');
  }
  if (typeof b.content !== 'string' || !b.content.trim()) {
    throw fail(400, 'content is required');
  }
  return { title: b.title.trim(), content: b.content, hasCategory: b.category !== undefined, category: b.category };
}

function loadOr404(req) {
  const id = parseId(req.params.id);
  const row = id && getOne.get(id);
  if (!row) throw fail(404, 'Post not found');
  return row;
}

router.get('/', (req, res) => {
  let rows;
  if (req.query.category !== undefined) {
    const id = parseId(String(req.query.category));
    rows = id ? listByCategory.all(id) : [];
  } else {
    rows = listAll.all();
  }
  res.json({ status: 'success', posts: rows.map(serialize.post) });
});

router.get('/:id', (req, res) => {
  const row = loadOr404(req);
  res.json({ status: 'success', message: 'Post fetched', postFound: serialize.post(row) });
});

router.post('/create', requireAuth, requireAdmin, requireJson, (req, res) => {
  const input = readInput(req.body);
  const categoryId = input.hasCategory ? parseCategory(input.category) : null;
  const info = insert.run(input.title, input.content, categoryId, req.user.id);
  res.status(201).json({
    status: 'success',
    message: 'Post created',
    newPost: serialize.post(getOne.get(info.lastInsertRowid)),
  });
});

router.put('/:id', requireAuth, requireAdmin, requireJson, (req, res) => {
  const existing = loadOr404(req);
  const input = readInput(req.body);
  const categoryId = input.hasCategory ? parseCategory(input.category) : existing.category_id;
  update.run(input.title, input.content, categoryId, existing.id);
  res.json({ status: 'success', message: 'Post updated', postUpdated: serialize.post(getOne.get(existing.id)) });
});

router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const existing = loadOr404(req);
  remove.run(existing.id);
  res.json({ status: 'success', message: 'Post deleted', deletedPost: serialize.post(existing) });
});

module.exports = router;
