# BlogMe Lite: Implementation Plan

Goal: a minimal, single-author blog that runs as **one Docker container** with a **SQLite file** on a small DigitalOcean droplet (1 vCPU, 2 GB RAM), behind Caddy at `blog.<domain>`. It is the place to publish write-ups of the author's other projects.

Keep it lite. If a feature is not listed under "In scope", do not build it.

## Instructions for the implementing agent

- The backend lives in `backend/` (Express + SQLite). The original Mongo backend was removed and can be recovered from git history (before the rename of `backend-lite/` to `backend/`).
- The **API contract at the bottom of this file is authoritative.** It was derived from the existing frontend and the old backend. The frontend reads Mongo-style names (`_id`, `categoryName`, `postFound`, ...), so the backend serializes to those names. Do not rename fields on the frontend.
- Before each phase, read the files that phase names. Do not assume.
- Finish each phase's "Done when" checks before starting the next. Commit after each phase with a clear message.
- Never commit secrets. `.env` is already in `.gitignore`; keep it that way.

## Scope

**In scope**
- One admin user (the owner) who can log in, create, edit and delete posts and categories.
- Public visitors can read the post list, a single post, and categories.
- Post fields: title, content (Markdown), category, created and updated timestamps.
- **Authoring (Phase 7):** a Markdown editor with a toolbar, live preview and paste/drag-drop image insertion. Images (PNG, JPEG, GIF, WebP, max 5 MB) are uploaded by the admin to `data/uploads` on the same volume and referenced from the Markdown by URL. Content stays Markdown; raw HTML is never rendered.
- Auth: **username** and password, JWT in an HttpOnly cookie.
- Single-container Docker deployment, one volume for the database, nightly backup.

**Out of scope for v1** (remove from the lite build, do not port)
- Google OAuth, Passport, Cloudinary and multer, SVG uploads, image resizing, thumbnails, galleries, a media library, image deletion UI, orphan cleanup, followers, notifications, dislikes, comments, likes, email verification, password reset, public registration, drafts (`published`), slugs, role checks, pagination, search, refresh tokens, `helmet`.
- MongoDB and Mongoose.

Likes, comments and slugs can come later as small additions once the blog is live.

## Target architecture

```
blog-project/
  backend/
    src/
      index.js            # express app, serves API + built frontend
      db.js               # better-sqlite3 connection + schema bootstrap
      serialize.js        # DB row -> API shape (_id, categoryName, ...)
      middleware/auth.js  # verify JWT cookie, attach req.user
      routes/             # posts.js, categories.js, user.js, uploads.js
      scripts/createAdmin.js
      scripts/backup.js   # db.backup() to a dated file, keep last 14
    package.json
    .env.example
  frontend/               # existing, trimmed (Phase 3)
  Dockerfile              # multi-stage: build frontend, run backend
  docker-compose.yml
  Caddyfile.snippet
  PLAN.md                 # this file
```

Stack: Node 22, Express 4, `better-sqlite3`, `bcryptjs`, `jsonwebtoken`, `cookie-parser`, `cors` (dev only, never loaded in production), `dotenv`. No ORM.

Schema (create in `db.js` with `CREATE TABLE IF NOT EXISTS`):

```sql
users(id INTEGER PK, username TEXT UNIQUE NOT NULL, email TEXT,
      password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))
categories(id INTEGER PK, name TEXT UNIQUE NOT NULL, description TEXT)
posts(id INTEGER PK, title TEXT NOT NULL, content TEXT NOT NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      author_id INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))
```

Notes:
- Enable `PRAGMA journal_mode = WAL` and `PRAGMA foreign_keys = ON`.
- Timestamps are ISO 8601 UTC strings. SQLite has no on-update trigger, so **set `updated_at` explicitly** in every UPDATE.
- `db.js` must `mkdirSync(dirname(DB_PATH), { recursive: true })` unless `DB_PATH` is `:memory:`, and close the DB on SIGTERM.

---

## Phase 0: API contract (mostly done by the architect review)

Remaining work:
1. Confirm the "API contract" table at the bottom against `frontend/src/services/` and the old routers. Fix any mismatch in the table, not in the frontend.
2. ~~Check what the create and edit forms send for `category`, and how post components read it.~~ **Done (verified in the code):**
   - `CreatePost.jsx` sends the category `_id` (string) and requires it.
   - `EditPost.jsx` has **no category field**: it holds only `{ title, content }`, and `updatePost` sends only `{ title, content }`. So `PUT /posts/:id` must treat `category` as optional and leave it unchanged when absent.
   - **No post component reads `post.category`** (`GetAllPosts`, `PostCard`, `PostDetails`). The only category-related read is `CategoryCard.jsx:39`, which reads `category.posts?.length || 0`.
3. Write down the list of frontend screens to change in Phase 3 (the "Frontend changes" list below is the starting point).

Already established:
- The frontend stores the token in **localStorage** and sends a **Bearer header** (`axiosInstance`, `Login.jsx`, `AuthContext`). Phase 3 replaces this with the cookie.
- API base URL is hard-coded to `http://localhost:3000` in `postsAPI.js`, `authAPI.js`, `categoryAPI.js` and `axiosInstance.js`.

Done when: the API contract table is confirmed and the Phase 3 screen list is written down.

## Phase 1: SQLite backend (`backend/`)

Do:
1. Scaffold `backend/` with `package.json` (`"start": "node src/index.js"`, `"dev": "node --watch src/index.js"`) and the dependencies above.
2. Write `db.js` (connection, pragmas, schema bootstrap, directory creation, SIGTERM close). Database path from `process.env.DB_PATH`, default `./data/blog.db`.
3. Write routes and a `serialize.js` that match the **API contract** exactly (paths, response keys, `_id` as a string).
   - Ids in URLs must be integers. A non-numeric or unknown id returns 404, never 500.
   - Validate post input: title 1 to 200 characters, content non-empty, `category` is an existing category id or null (400 if it does not exist).
   - Write operations require auth, and accept only `application/json`.
   - No public register route.
4. Auth middleware: read a JWT from an HttpOnly cookie, verify with `JWT_SECRET` and `algorithms: ['HS256']`, check the user id still exists, attach `req.user`. Missing or invalid token returns **401**.
   - Token and cookie expiry: 7 days (`maxAge` matches).
   - Cookie flags: `httpOnly`, `sameSite: 'lax'`, `secure` when `NODE_ENV=production`.
   - In production, refuse to start if `JWT_SECRET` is shorter than 32 characters.
5. Login: `POST /user/login` takes `{ username, password }`. Any failure returns a generic 401 `Invalid credentials` (the old code's 404 "User not found" leaks usernames). Success sets the cookie and returns `{ status, message, user }`. **Do not return the token in the body.**
6. Fix the bugs found in the old controller: await the category lookup and save the category id correctly, do not require an image, and use parameterized SQL everywhere.
7. `scripts/createAdmin.js`: takes username, email and password as **CLI args or an interactive prompt** (not from `.env`), enforces a password of at least 12 characters, hashes with bcryptjs, inserts the admin if none exists. This replaces registration.
8. Error middleware returning `{ status: "fail", message }` with the real status code (400, 401, 404). Unknown `/api/*` paths return a JSON 404 **before** the SPA fallback.
9. Hardening: `express.json({ limit: '100kb' })`, `app.set('trust proxy', 1)` (Caddy is the one proxy), a login rate limit keyed by IP (a small in-memory counter is fine), and a `GET /health` route.
10. `.env.example` with `PORT`, `JWT_SECRET`, `DB_PATH`, `CLIENT_ORIGIN`, `NODE_ENV`. **No admin credentials in it.**

Done when:
- `npm start` runs with no MongoDB installed.
- `curl` can: create the admin, log in, create a category, create a post, list posts, edit, delete, and get a 401 on writes without the cookie.
- `curl -i` on login shows `Set-Cookie` with `HttpOnly`, `SameSite=Lax` (and `Secure` when `NODE_ENV=production`).
- `curl` on an unknown `/api/...` path returns JSON 404, not `index.html`.
- Restarting the server keeps the data.

## Phase 2: Tests for the backend

Do:
1. Use Node's built-in test runner (`node --test`) and `supertest`, with `DB_PATH=:memory:`.
2. Cover:
   - Login success and failure (generic 401), and the cookie flags.
   - Protected routes return 401 without a cookie.
   - Post CRUD and category CRUD, with the response keys from the API contract.
   - Non-numeric and unknown ids return 404.
   - Deleting a category does not delete its posts.
   - SQL injection strings in titles are stored as plain text.
   - No response body contains `password_hash`.

Done when: `npm test` passes.

## Phase 3: Frontend trim and wiring

Read: every frontend file named in Phase 0. Keep MUI and the existing look.

Do, **in this order** (everything else depends on 1 and 2):
1. **One axios instance.** Make `axiosInstance` the only HTTP client, with `baseURL: (import.meta.env.VITE_API_URL ?? "") + "/api/v1"` and `withCredentials: true`. Service files (`postsAPI.js`, `authAPI.js`, `categoryAPI.js`) use relative paths through it. Remove all hard-coded `http://localhost:3000` and all bare `axios` calls. In development, add a Vite proxy for `/api` to `http://localhost:3000`.
2. **Cookie auth.** Remove localStorage token storage, the Bearer header, and the persisted `user` in `AuthContext`.
   - On load, `AuthContext` calls `GET /user/profile` to decide whether the user is logged in.
   - Add an axios 401 interceptor that dispatches LOGOUT.
   - `handleLogout` (`PrivateNav.jsx`) calls `POST /user/logout`.
   - `Login.jsx` posts `{ username, password }` and dispatches the `user` from the response.
3. Remove out-of-scope UI and service code:
   - `postImage` reads in `GetAllPosts.jsx` and `PostDetails.jsx` (they crash when the field is missing), and the image upload fields in create and edit.
   - Likes: the `likePost` service function, the like button and the like count in `PostDetails`.
   - `/register`, the "Sign up" link, "Forgot your password?", "Remember me", and the commented-out Google code in `Login.jsx`.
4. Send posts as **JSON**, not FormData: `{ title, content, category }` on create (drop the image field and its validation in `CreatePost.jsx`). `EditPost.jsx` has no category field today: add the same category select as `CreatePost.jsx` (pre-selected from `postFound.category`) and have `updatePost` send it.
5. `CategoryCard` reads `category.posts?.length || 0`. Change it to read `category.postCount` (the API contract provides it).
6. Show Create, Edit and Delete controls only when logged in.
7. Render post content as Markdown (add `react-markdown`; no raw HTML rendering).
8. Post list shows title, category, date and a short excerpt.
9. Add a simple 404 route.

Done when: with backend and frontend both running locally, the owner can log in, write a post in Markdown, see it on the public list while logged out, edit it and delete it. A page reload keeps the login (via the cookie), and logout really clears it.

## Phase 4: Containerize

Do:
1. Multi-stage `Dockerfile` on **`node:22-slim`** for all stages (avoids Alpine build problems with `better-sqlite3`).
   - Stage 1: `npm ci` and `npm run build` in `frontend/`.
   - Stage 2: install `backend` production dependencies, copy the built frontend into `backend/public`, `chown` `/app/data` to the `node` user, and run as `USER node`.
   - A Vite build on 2 GB RAM beside Caddy is tight. Either add swap on the droplet or build the image elsewhere (CI or the dev machine) and push it.
2. In `index.js`, serve `public/` statically and fall back to `index.html` for non-`/api` routes (React Router support).
3. `docker-compose.yml`: one `blog` service, `init: true`, volume `blog-data:/app/data`, env from `.env`, `restart: unless-stopped`, no published ports, memory limit around 300 MB. Attach it to the **external Caddy network** by name and give it the alias `blog`.
4. `.dockerignore` excluding `node_modules`, `.env` and `.git`.

Done when: `docker compose up --build` serves the whole app on one port, the container can write the database as the `node` user, and the data survives `docker compose down` followed by `up`.

## Phase 5: Deploy on the droplet

Prerequisites (done outside this repo): droplet hardened, Docker installed, Caddy running in a shared Docker network, an A record for `blog.<domain>` pointing to the droplet.

Do:
1. Put the project on the droplet (`git clone`) and create `.env` on the server with a long random `JWT_SECRET` (`openssl rand -hex 32`).
2. Join the blog container to Caddy's Docker network and add to the Caddyfile:
   ```
   blog.<domain> {
       encode gzip
       reverse_proxy blog:3000
   }
   ```
3. Create the admin: `docker compose exec -it blog node src/scripts/createAdmin.js` (interactive prompt, so the password is never stored in `.env`).
4. Nightly backup: a cron job runs `docker compose exec -T blog node src/scripts/backup.js`, which uses better-sqlite3's `db.backup()` (the image has no `sqlite3` CLI, and copying a live WAL file is unsafe). It keeps the last 14 and optionally copies to object storage.
5. Test a restore on a scratch copy at least once.
6. Link the blog from the GitHub Pages portfolio.

Done when: `https://blog.<domain>` loads over HTTPS, login works, a post can be published, and a backup file exists and restores.

## Phase 6: Optional later additions

Only after the blog is live and has real posts:
- Slugs (reject all-digit slugs so they never collide with numeric ids), RSS feed (`/rss.xml`), a sitemap, and basic SEO meta tags.
- Likes (a `likes` count column plus a per-IP or per-session guard).
- Comments with moderation.
- Orphaned-image cleanup script (list files in `data/uploads` not referenced by any post).
- CI/CD with GitHub Actions: build the image, push, SSH to the droplet and `docker compose up -d`.
- Uptime Kuma monitor on `/health`.

---

## API contract

Base: `/api/v1`. All bodies are JSON. IDs are emitted as `_id` (string form of the integer). Errors are `{ status: "fail", message }`. Success has `status: "success"`.

Field names: categories use `categoryName` and `categoryDescription`; posts use `title`, `content`, `category`, `createdAt`, `updatedAt`. The serializer maps these from the snake_case columns.

| Method and path | Auth | Request body | Success response |
|---|---|---|---|
| `POST /user/login` | no | `{ username, password }` | `{ status, message, user: { _id, username, role } }` and sets the cookie |
| `POST /user/logout` | no | none | `{ status, message }` and clears the cookie |
| `GET /user/profile` | yes | none | `{ status, user: { _id, username, role } }` (401 if not logged in) |
| `GET /posts` | no | none; optional `?category=<id>` | `{ status, posts: [...] }`, newest first |
| `GET /posts/:id` | no | none | `{ status, message, postFound }` |
| `POST /posts/create` | yes | `{ title, content, category }` | 201 `{ status, message, newPost }` |
| `PUT /posts/:id` | yes | `{ title, content, category }` | `{ status, message, postUpdated }` |
| `DELETE /posts/:id` | yes | none | `{ status, message, deletedPost }` |
| `GET /category` | no | none | `{ status, categories: [...] }` |
| `GET /category/:id` | no | none | `{ status, message, categoryFound }` |
| `POST /category/create` | yes | `{ categoryName, categoryDescription }` | 201 `{ status, message, categoryCreated }` |
| `PUT /category/:id` | yes | `{ categoryName, categoryDescription }` | `{ status, message, categoryUpdated }` |
| `DELETE /category/:id` | yes | none | `{ status, message, deletedCategory }` |
| `POST /uploads` | yes | raw image bytes; `Content-Type` is one of `image/png`, `image/jpeg`, `image/gif`, `image/webp`; max 5 MB | 201 `{ status, message, url: "/uploads/<uuid>.<ext>", name }` |
| `GET /uploads/:name` (not under `/api/v1`) | no | none | image bytes with `Cache-Control: public, max-age=31536000, immutable` and `X-Content-Type-Options: nosniff`; JSON 404 if missing |
| `GET /health` (not under `/api/v1`) | no | none | `{ status: "ok" }` |

Notes:
- Paths are the literal ones the frontend already uses: `/category` is singular, and creates are `/posts/create` and `/category/create`.
- `category` in post request bodies is a category `_id` string or null. On `PUT`, an **absent** `category` leaves the stored value unchanged; an explicit `null` clears it.
- `category` in post responses is the category `_id` string or null (verified: no frontend component reads it, so no populated object is needed).
- Category responses include `postCount` (integer). `CategoryCard` is changed to read it in Phase 3.
- No response ever includes `password_hash` or the JWT.
- Uploads: type is checked by magic bytes, not the client header; the extension comes from the detected type; SVG and anything else is 415; over 5 MB is 413; an empty body is 415. Files are never deleted when posts are edited or deleted.
- Status codes: 400 validation, 401 missing or invalid auth or bad credentials, 404 unknown id, route or upload, 413 body too large, 415 unsupported content type, 429 too many login attempts, 201 on create.

---

## Phase 7: Markdown editor and image uploads (owner request, supersedes the old "no uploads" scope)

Design by the architect; no new frontend dependency and no `multer`.

**Backend** (`backend/`):
1. `src/uploadDir.js` (shared helper): `UPLOAD_DIR` is `UPLOAD_DIR` env or `<DB dir>/uploads`, created at startup (a temp dir when `DB_PATH` is `:memory:`).
2. `src/routes/uploads.js`: `POST /api/v1/uploads`, `requireAuth` first, then `express.raw({ type: [png, jpeg, gif, webp], limit: '5mb' })` on this route only. Sniff magic bytes (PNG, JPEG, GIF87a/89a, RIFF....WEBP); extension from the detected type; reject SVG and mismatches with 415. Name is `crypto.randomUUID()` plus extension, written with flag `wx`. Respond 201 with `{ status, message, url, name }`. Map `entity.too.large` to 413 `Image too large (max 5 MB)`.
3. `app.js`: mount the router before the `/api` 404. Serve `/uploads` with `express.static(UPLOAD_DIR, { index: false, dotfiles: 'deny', redirect: false, fallthrough: false, maxAge: '365d', immutable: true })` plus `X-Content-Type-Options: nosniff` and `Content-Security-Policy: default-src 'none'; img-src 'self'; sandbox`. Mount it **before** the SPA fallback so a missing file is a JSON 404, not `index.html`.
4. `.gitignore` covers `backend/data` (check `uploads`). `.env.example`: optional `UPLOAD_DIR`. Optional `request_body { max_size 6MB }` in `Caddyfile.snippet`.
5. `backup.js` stays DB-only. Docs: the backup unit is the whole `blog-data` volume: `backups/` plus `uploads/`, copy both off the droplet (rsync suits immutable files).

**Frontend** (`frontend/`):
1. `src/services/uploadsAPI.js`: `uploadImage(file)` posts the raw `File` with an explicit `Content-Type`; client pre-checks type and 5 MB.
2. `src/components/posts/PostContent.jsx`: shared `Box` plus `ReactMarkdown` (no `rehype-raw`) with an `img` renderer (`loading="lazy"`, `maxWidth: 100%`, `height: auto`), used by `PostDetails` and the editor preview.
3. `src/components/posts/MarkdownEditor.jsx`: MUI multiline `TextField` plus a toolbar (bold, italic, heading, bullet list, numbered list, quote, inline code, code block, link, image button), Write/Preview toggle (side by side on `md+`), paste and drag-drop upload. Insert `![Uploading name...]()` at the caret, then replace it with `![alt](/uploads/<name>)`; remove it and show an error on failure; disable Save while an upload is in flight.
4. Wire into `CreatePost.jsx` and `EditPost.jsx` (keep "content required"), `PostDetails.jsx` (use `PostContent`), `PostCard.jsx` (excerpt drops `![...](...)` entirely), and add `/uploads` to the Vite proxy.

**Security:** only the four image types by magic bytes; SVG rejected; random server-made names; `nosniff` and a sandbox CSP on `/uploads`; admin-only; 5 MB cap; no raw HTML rendering. Uploaded images are public by URL and keep their EXIF data (do not upload photos with location data). `docker compose down -v` deletes uploads along with the database.

**Done when:** after login, the toolbar works on selections; paste, drag-drop and the image button each insert an image that shows in the preview and on the post page; `curl -I /uploads/<name>` shows `nosniff` and the cache headers; a missing upload is a JSON 404; SVG, a fake PNG and an oversize file are rejected; and uploads survive a container recreate.
