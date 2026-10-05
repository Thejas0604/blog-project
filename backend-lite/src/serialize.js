// DB row -> API shape (Mongo-style names the frontend expects).
const idStr = (n) => (n === null || n === undefined ? null : String(n));

const user = (row) => ({ _id: idStr(row.id), username: row.username, role: row.role });

const post = (row) => ({
  _id: idStr(row.id),
  title: row.title,
  content: row.content,
  category: idStr(row.category_id),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// Expects a row that includes post_count.
const category = (row) => ({
  _id: idStr(row.id),
  categoryName: row.name,
  categoryDescription: row.description,
  postCount: row.post_count,
});

module.exports = { user, post, category };
