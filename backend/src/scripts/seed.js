// Usage: node src/scripts/seed.js
// TEST DATA ONLY. Adds sample categories and tech posts, authored by the admin.
// Safe to run again: existing categories and posts (matched by name/title) are skipped.
// Requires an admin first: node src/scripts/createAdmin.js
const db = require('../db');

const categories = [
  { name: 'JavaScript', description: 'Language features, tooling and patterns.' },
  { name: 'DevOps', description: 'Containers, deployment and operations.' },
  { name: 'Databases', description: 'SQL, SQLite and data modelling.' },
  { name: 'Web', description: 'HTTP, browsers and frontend work.' },
  { name: 'Security', description: 'Authentication and safe defaults.' },
];

const posts = [
  {
    category: 'JavaScript',
    title: 'Understanding the JavaScript Event Loop',
    content: `JavaScript runs on a single thread, yet it handles timers, network calls and user input without freezing. The **event loop** makes that possible.

## The pieces

- **Call stack**: where synchronous code runs.
- **Task queue**: callbacks from timers and I/O.
- **Microtask queue**: promise callbacks, run before the next task.

## Order of execution

\`\`\`js
console.log('1 sync');
setTimeout(() => console.log('4 timeout'), 0);
Promise.resolve().then(() => console.log('3 microtask'));
console.log('2 sync');
\`\`\`

Output: 1, 2, 3, 4. Microtasks always drain before the next task starts.

> Never block the stack with long loops; split the work or move it to a worker.`,
  },
  {
    category: 'JavaScript',
    title: 'Async/Await Patterns You Will Actually Use',
    content: `\`async/await\` is syntax over promises. A few patterns cover most real code.

### Run independent work in parallel

\`\`\`js
const [user, posts] = await Promise.all([getUser(id), getPosts(id)]);
\`\`\`

### Handle errors once

\`\`\`js
try {
  const res = await fetch('/api/v1/posts');
  if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
  return await res.json();
} catch (err) {
  console.error(err);
}
\`\`\`

### Common mistakes

1. Awaiting inside a loop when the calls are independent.
2. Forgetting \`await\`, so you get a pending promise.
3. Swallowing errors with an empty \`catch\`.`,
  },
  {
    category: 'JavaScript',
    title: 'ES Modules vs CommonJS in 2026',
    content: `Node supports both module systems. Which one you pick affects imports, tooling and top-level \`await\`.

| Feature | CommonJS | ES Modules |
|---|---|---|
| Syntax | \`require()\` | \`import\` |
| Loading | Synchronous | Asynchronous |
| Top-level await | No | Yes |
| Default in Node | \`.js\` without \`"type"\` | \`.mjs\` or \`"type": "module"\` |

New projects should prefer ES modules. Existing CommonJS code keeps working, and you can migrate one file at a time.`,
  },
  {
    category: 'DevOps',
    title: 'Docker Multi-Stage Builds Explained',
    content: `A multi-stage build uses several \`FROM\` lines. Only the last stage becomes the image, so build tools stay out of production.

\`\`\`dockerfile
FROM node:22-slim AS build
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM node:22-slim
COPY --from=build /app/dist ./public
CMD ["node", "server.js"]
\`\`\`

## Why it helps

- Smaller images, since compilers and dev dependencies are left behind.
- Faster pulls and a smaller attack surface.
- One Dockerfile for build and runtime.

Order your \`COPY\` lines from least to most frequently changed so the layer cache works for you.`,
  },
  {
    category: 'DevOps',
    title: 'A Sensible Nightly Backup for a Small Server',
    content: `Small projects need a backup that is simple enough to actually run.

## Checklist

- [x] Back up the database with a consistent method, not a raw file copy.
- [x] Keep several generations and delete old ones.
- [ ] Copy backups **off** the server.
- [ ] Practise a restore at least once.

## Cron example

\`\`\`
15 3 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1
\`\`\`

A backup you have never restored is only a hope.`,
  },
  {
    category: 'DevOps',
    title: 'Reverse Proxies: What Caddy Does for You',
    content: `A reverse proxy sits in front of your app and forwards requests to it.

With **Caddy**, a whole site can be this small:

\`\`\`
blog.example.com {
    encode gzip
    reverse_proxy blog:3000
}
\`\`\`

Caddy obtains and renews HTTPS certificates automatically, compresses responses and hides your app from the public internet. Your app only needs to listen on an internal port.`,
  },
  {
    category: 'Databases',
    title: 'Why SQLite Is Enough for Most Small Apps',
    content: `SQLite is a database in a single file. For a single-author blog it is hard to beat.

## Strengths

- No separate server to run, secure or patch.
- Fast reads, and WAL mode allows readers during a write.
- A backup is one consistent file.

## Limits

- One writer at a time.
- Not designed for many app servers sharing one database over a network.

Turn on \`PRAGMA foreign_keys = ON\` for every connection; it is off by default.`,
  },
  {
    category: 'Databases',
    title: 'SQL Indexes in Five Minutes',
    content: `An index lets the database find rows without scanning the whole table.

\`\`\`sql
CREATE INDEX idx_posts_category ON posts (category_id);
EXPLAIN QUERY PLAN SELECT * FROM posts WHERE category_id = 3;
\`\`\`

Look for \`SEARCH ... USING INDEX\` in the plan instead of \`SCAN\`.

### Rules of thumb

1. Index columns you filter or join on.
2. Do not index everything; each index slows writes.
3. Measure with the query plan, not with guesses.`,
  },
  {
    category: 'Web',
    title: 'HTTP Caching Headers, Demystified',
    content: `Good caching makes a site fast without changing the code.

| Header | Purpose |
|---|---|
| \`Cache-Control\` | How long, and who may cache. |
| \`ETag\` | Lets the browser ask "has it changed?". |
| \`Content-Type\` | Tells the browser what the bytes are. |

Files with unique names, like \`logo.3f9a1c.png\`, can use \`Cache-Control: public, max-age=31536000, immutable\`. The HTML page that refers to them should be revalidated each time.`,
  },
  {
    category: 'Web',
    title: 'Responsive Layouts With CSS Grid',
    content: `Grid makes card layouts easy to write and easy to read.

\`\`\`css
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}
\`\`\`

This gives as many columns as fit, each at least 260px wide, with no media queries. On a phone you get one column; on a wide screen you get four or five.`,
  },
  {
    category: 'Web',
    title: 'Single-Page Apps and the Server Fallback',
    content: `With client-side routing, \`/posts/7\` is not a real file on the server. If a visitor refreshes that URL, the server must return \`index.html\` so the router can take over.

Things to get right:

1. Serve static files first.
2. Return \`index.html\` for other **GET** requests.
3. Keep API paths out of the fallback so a typo returns a JSON 404, not a web page.`,
  },
  {
    category: 'Security',
    title: 'Storing Login Tokens: Cookie or localStorage?',
    content: `Where you keep a login token decides what an attacker can steal.

- **localStorage**: any script on the page can read it, so a single XSS bug leaks the token.
- **HttpOnly cookie**: scripts cannot read it. Add \`SameSite=Lax\` and \`Secure\` for protection against cross-site requests and plain HTTP.

For a small single-user site, an HttpOnly cookie is the simpler and safer default.`,
  },
  {
    category: 'Security',
    title: 'Hashing Passwords the Right Way',
    content: `Never store passwords, and never use a fast hash like plain SHA-256.

Use a slow, salted algorithm such as **bcrypt** or **argon2**:

\`\`\`js
const hash = bcrypt.hashSync(password, 12);
const ok = bcrypt.compareSync(attempt, hash);
\`\`\`

The cost factor makes each guess expensive. Return the same generic error for a wrong username and a wrong password so you do not reveal which accounts exist.`,
  },
  {
    category: null,
    title: 'Notes on Writing Better Commit Messages',
    content: `A good commit message explains **why**, not just what.

\`\`\`
fix: reject uploads whose bytes do not match the type

The Content-Type header is client-controlled, so check the
file signature before saving.
\`\`\`

Keep the first line short, use the imperative mood, and put detail in the body. Future you will be grateful.`,
  },
];

function main() {
  const admin = db.prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1").get();
  if (!admin) throw new Error('No admin found. Run: node src/scripts/createAdmin.js');

  const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)');
  const findCategory = db.prepare('SELECT id FROM categories WHERE name = ?');
  const findPost = db.prepare('SELECT 1 FROM posts WHERE title = ?');
  const insertPost = db.prepare(
    'INSERT INTO posts (title, content, category_id, author_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  );

  let newCategories = 0;
  let newPosts = 0;
  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();

  db.transaction(() => {
    for (const c of categories) {
      newCategories += insertCategory.run(c.name, c.description).changes;
    }
    posts.forEach((p, i) => {
      if (findPost.get(p.title)) return;
      const categoryId = p.category ? findCategory.get(p.category).id : null;
      // Spread dates over the last ~2 weeks, oldest first, so the list looks lived in.
      const ts = new Date(now - (posts.length - i) * DAY).toISOString();
      insertPost.run(p.title, p.content, categoryId, admin.id, ts, ts);
      newPosts += 1;
    });
  })();

  console.log(`Seed done: ${newCategories} categories and ${newPosts} posts added.`);
}

try {
  main();
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  db.close();
}
