# Milestones

One section per phase of `/PLAN.md`. A phase is "done" only when its "Done when" checks were seen to pass.

| Phase | Name | Status |
|---|---|---|
| 0 | API contract | done |
| 1 | SQLite backend | done |
| 2 | Backend tests | skipped by owner for now |
| 3 | Frontend trim and wiring | built, build verified; UI click-through not done (not done) |
| 4 | Containerize | done (checked on Docker 29.8.1 with the dev override; Caddy and droplet not covered) |
| 5 | Deploy on the droplet | not started |
| 6 | Optional additions | not started |
| 7 | Markdown editor and image uploads | in progress (backend done and curl-verified; frontend built; container upload persistence seen; UI click-through not done) |

## Phase 0: API contract

- Status: done
- Date: 2026-10-05 (docs pass date; exact completion date unverified)
- Built: API contract table at the bottom of PLAN.md, produced by the architect review. Verified in the frontend code: `CreatePost.jsx` sends a category `_id`; `EditPost.jsx` sends only `{ title, content }`; no post component reads `post.category`; `CategoryCard.jsx` reads `category.posts?.length`.
- Changed from plan: none known.
- Verification: architect review per PLAN.md. I did not re-run the check against `frontend/src/services/` (unverified by docs).
- Known gaps: the Phase 3 screen list is the "Frontend changes" list in PLAN.md. The old `docs/api/overview.md` described the Mongo-era API (`/categories`, register, `email` login) and was rewritten; the contract uses `/category`.

## Phase 1: SQLite backend (`backend/`)

- Status: done (developer verified; docs pass re-ran the checks below)
- Date: 2026-10-05 (no git commit for `backend/` existed when this was written; it is untracked)
- Built: Express 4 app on SQLite (`better-sqlite3`, WAL, foreign keys). Files: `src/index.js`, `app.js`, `db.js`, `serialize.js`, `middleware/auth.js`, `middleware/http.js`, `routes/user.js`, `posts.js`, `categories.js`, `scripts/createAdmin.js`, `scripts/backup.js`, plus `.env.example`. All 14 endpoints of the contract exist. Login sets an HttpOnly `token` cookie (7 days); logout clears it; per-IP login rate limit; `/health`; JSON 404 and error handler.
- Changed from plan (dev-time deviations, all additions, none break the contract):
  - `middleware/http.js` with `requireJson` and `parseId` helpers. Plan listed only `middleware/auth.js`. Reason: share the "JSON only" and "integer id or 404" rules across routers.
  - 415 `Content-Type must be application/json` on non-JSON writes (and on login). Plan said "accept only `application/json`" without a status code.
  - Rate-limit rules, which the plan left open: 10 failed logins per IP per fixed 15 minute window, then 429 `Too many attempts, try again later`. Only failures count; a success resets the counter (only while not blocked). In memory.
  - Also 413 for bodies over 100 KB (from `express.json`) and 400 `Invalid JSON body` for malformed JSON.
  - `PUT /posts/:id` requires `title` and `content`; `category` optional (absent keeps, `null` clears), as in the contract notes.
  - `PUT /category/:id` accepts partial bodies (absent fields keep their value); the contract does not say.
  - `GET /posts?category=<bad or unknown>` returns 200 with an empty list.
  - `JWT_SECRET` is required in every environment (plan only required length in production).
  - `createAdmin.js` has no reset mode; see [operations.md](operations.md#reset-the-admin-password) for the manual procedure.
  - `backup.js` writes to `<DB dir>/backups` and keeps 14.
- Verification (docs pass, 2026-10-05, throwaway `DB_PATH` and `JWT_SECRET`, server on a spare port, cleaned up afterwards):
  - Admin: `createAdmin.js` created the admin; a short password exited 1; a second run printed "An admin already exists".
  - `curl` flow: login, create category, duplicate category (400), create post, list, `PUT` with category absent / `null` / unknown id (kept / cleared / 400), delete post and category (200 with body, 404 on repeat), 401 without cookie, profile, logout.
  - `Set-Cookie`: `HttpOnly; SameSite=Lax; Max-Age=604800`, and `Secure` as well when `NODE_ENV=production`; no token in any body.
  - 404 JSON for `/api/v1/nope`, `abc` and unknown ids; 415 on non-JSON; 400 on bad JSON; 413 on a 200 KB body.
  - Rate limit: 10 x 401, then 429, and the correct password was also 429 while blocked.
  - Startup refusals: no `JWT_SECRET`; production with a short secret.
  - Backup: two runs wrote two files in `<DB dir>/backups`; opening one read-only showed the admin row and `integrity_check: ok`.
  - Deleting a category kept its posts (category became `null`).
  - Not run by me: "restarting keeps the data" with a server restart (I confirmed the data is in the on-disk file via the separate backup process), the 14-file pruning (read in code only), and the Phase 1 "no MongoDB installed" check beyond the fact that no Mongo dependency is in `package.json`.
- Known gaps: no automated tests (Phase 2 skipped). Rate limit is lost on restart and keyed on `req.ip`, so it is only correct behind a single trusted proxy (`trust proxy` = 1). Logout and password changes do not revoke tokens. Backups sit on the same volume as the database. (Static serving and the SPA fallback were added in Phase 4.) PLAN.md's status-code list omits 413, 415 and 429, and its category `PUT` row does not mention partial updates (reported, PLAN.md not edited).

## Phase 2: Backend tests

- Status: skipped by the owner for now (not started, deliberate)
- Consequence: Phase 1 behavior is verified only by manual `curl` checks. No `npm test` script exists (confirmed in `package.json`).
- Known gaps: none of the Phase 2 coverage list (cookie flags, 401s, 404 ids, category delete keeps posts, SQL injection strings, no `password_hash` in bodies) is automated.

## Phase 3: Frontend trim and wiring

- Status: built; `npm run build` and the cookie flow were verified; NOT done by the PLAN.md definition (the browser click-through of "Done when" was not performed)
- Date: 2026-10-05 (uncommitted in git when read; `frontend/` changes are modified or untracked)
- Built (read from `frontend/src`):
  - `src/utils/axiosInstance.js` is the only HTTP client: `baseURL = (VITE_API_URL ?? "") + "/api/v1"`, `withCredentials: true`, and a 401 interceptor that calls a handler registered by `AuthContext` (dispatches `LOGOUT`).
  - `AuthContext` has `user` and `ready`; on load it calls `GET /user/profile`; no `localStorage`. `App.jsx` renders nothing until `ready`.
  - `vite.config.js` proxies `/api` to `http://localhost:3000`.
  - `Register` and `ForgotPassword` components deleted; likes and image upload removed.
  - Markdown rendering with `react-markdown` in `PostDetails`; `EditPost` has a category select (sends `null` when none); `CategoryCard` reads `postCount`.
  - `NotFound` page and a `*` route; create/edit post and category routes redirect to `/login` when logged out.
  - Login shows "Too many attempts. Try again later." on a 429, otherwise "Invalid username or password."
  - `@emotion/react` and `@emotion/styled` added to `package.json` (the build failed without them).
- Changed from plan: none known beyond the Emotion dependencies. The login form still validates a 6 character minimum client-side while the admin password minimum is 12 (harmless; the server decides).
- Verification:
  - Developer: `npm run build` passed; the login cookie flow worked via `curl` through the Vite proxy.
  - Docs pass: the frontend built inside the Docker build stage (stage 1 completed on `node:22-slim`; earlier also on `node:20-slim`). `npm run lint` was run: 35 errors, 1 warning (mostly `react/prop-types`, an unused `React` import in `PostDetails.jsx`, a fast-refresh warning in `AuthContext.jsx`).
  - Not verified in a browser: Markdown rendering (including GFM tables and dark-mode look), 404 page, route redirects when logged out, logout button, login persisting across a reload, the 429 message, the mobile menu, and the full "log in, write, see it logged out, edit, delete" scenario.
- Known gaps: the click-through above; lint errors; the mobile drawer is marked "have to optimize" in the code; `PostDetails` does a second request to fetch the category name (works because the API returns the category id).

## Phase 4: Containerize

- Status: done. All three PLAN.md "Done when" checks were seen to pass on the committed Dockerfile (Docker 29.8.1, dev compose override). Caddy, the droplet and a Linux host were not covered.
- Date: 2026-10-05
- Built: `Dockerfile` (stage 1 builds the frontend on `node:22-slim`; stage 2 (also `node:22-slim`) runs `backend` with `NODE_ENV=production`, `DB_PATH=/app/data/blog.db`, `PORT=3000`, frontend copied to `/app/public`, `USER node`, `/app/data` chowned to `node`); `docker-compose.yml` (service `blog`, `init: true`, `restart: unless-stopped`, `env_file: .env`, volume `blog-data` at `/app/data`, `mem_limit: 300m`, no published ports, external network `${CADDY_NETWORK:-caddy}` with alias `blog`); `docker-compose.dev.yml` (publishes `127.0.0.1:3000`, replaces the network; needs Compose v2.24+); `.dockerignore`; `Caddyfile.snippet`; root `.env.example` (`JWT_SECRET`, optional `CADDY_NETWORK`); and in `backend/src/app.js` a JSON 404 for unknown `/api/*` paths, then static serving of `public/` and a `GET *` fallback to `index.html`, both only if `public/index.html` exists.
- Changed from plan: none known. Compose must use the root `.env.example`; `backend/.env.example` would override `NODE_ENV` and `DB_PATH` in the container.
- Defect found and fixed (docs pass, Docker Desktop 4.93, Compose v5.5.1): `docker build .` failed at `RUN npm ci --omit=dev` in stage 2. The Dockerfile line 16-17 now reads `RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force` (with a comment). The committed Dockerfile was then built and confirmed `docker build` succeeds and `require('better-sqlite3')` works in the container. The cause: `better-sqlite3@13.0.3` has no install script and ships prebuilt binaries in the package (`prebuilds/linux-x64.node`), but npm runs `node-gyp rebuild` by default when a `binding.gyp` exists, and `node:*-slim` has no Python or compiler (`gyp ERR! find Python`). Switching Node versions alone does not help. The fix was first verified in a scratch copy (my own run): with `--ignore-scripts` the image built on `node:22-slim` and on `node:20-slim`, and `require('better-sqlite3')` worked in both. Application code and the Dockerfile were not modified by the docs pass.
- Node 22 switch: both Dockerfile stages are `node:22-slim`, `backend/package.json` `engines.node` is `>=22` (matching `better-sqlite3`), and PLAN.md was updated. The developer then ran the committed files on Docker 29.8.1 with the dev compose override (reported by the developer, not re-run by the docs pass):
  - Build succeeded; Node `v22.23.3`; container user `uid=1000(node)`; `/app/data` owned by `node`; `NODE_ENV=production`, `DB_PATH=/app/data/blog.db`.
  - `/health` returned `{"status":"ok"}` on `localhost:3000`; `/` and `/posts/1` returned `200 text/html` (SPA fallback); `/api/v1/nope` returned the JSON 404; `GET /api/v1/posts` returned the empty list.
  - `createAdmin.js` created the admin in the container; login returned 200 with `HttpOnly; Secure; SameSite=Lax; Max-Age=604800`; a post was created with that cookie.
  - `backup.js` wrote `/app/data/backups/blog-<stamp>.db`; `docker compose cp` copied it out; on the host it showed 1 post and `integrity_check: ok`.
  - A post, the admin and an uploaded image survived `docker compose down` (no `-v`) followed by `up -d`. This is the literal PLAN.md check.
  - Earlier, on a patched copy of the Dockerfile (docs pass): `up -d --force-recreate` also kept the data and the old cookie.
  - A PNG upload and its fetch worked in the container, with `nosniff` and CSP headers.
  - Idle memory about 20 MiB of the 300 MiB limit.
  - Both compose files merged correctly with `docker compose config` on Compose v5.5.1.
- Not verified: `docker compose up` with the base file and a real external Caddy network; the `CADDY_NETWORK` override; `stop`/`restart`; the `Secure` cookie over plain `http://localhost` in a browser; the 14-file backup pruning; behavior on a Linux host or the droplet.
- Known gaps:
  - Vulnerability reduction from moving `node:20-slim` to `node:22-slim` is unmeasured: `docker scout` needs a login and no other scanner was available. Node 20 is end of life, which is the reason for the move.

## Phase 5: Deploy on the droplet

- Status: not started. It happens on the droplet (Caddy, DNS, cron, HTTPS), outside this repo. See [deploy.md](deploy.md); nothing in it was run on the droplet.

## Phase 6: Optional later additions

- Status: not started. Not in the v1 build.

## Phase 7: Markdown editor and image uploads

- Status: in progress. Backend done and curl-verified; frontend built and `npm run build` passes; the UI click-through was not done. Not done by the PLAN.md definition: the "Done when" list includes browser checks, which were not done (container persistence of an upload was seen by the developer).
- Date: 2026-10-05 (uncommitted; `routes/uploads.js`, `uploadDir.js` and the new frontend editor files are untracked)
- Built (backend, read from the code):
  - `src/uploadDir.js`: upload directory from `UPLOAD_DIR`, else `<DB dir>/uploads`, else a temp dir for `:memory:`.
  - `src/routes/uploads.js`: `POST /api/v1/uploads`, `requireAuth` then `express.raw` (4 image types, 5 MB), magic-byte sniff that must match the `Content-Type`, UUID name with `wx` write, 201 `{status, message, url, name}`.
  - `app.js`: uploads router mounted before the `/api` 404; `/uploads` served by `express.static` (`index:false`, `dotfiles:'deny'`, `redirect:false`, `fallthrough:false`, 365d immutable) with `nosniff` and a sandbox CSP, mounted before the SPA fallback; error handler maps oversize uploads to `Image too large (max 5 MB)` and hides paths on `/uploads` 404.
  - `backend/.env.example`: optional `UPLOAD_DIR`. `Caddyfile.snippet`: `request_body { max_size 6MB }`.
  - `backup.js` still backs up the database only; it now uses `db.name` for the backups folder, so it follows the resolved DB path.
- Built (frontend, read from the code; see [writing-posts.md](writing-posts.md) and [architecture.md](architecture.md#markdown-editor-phase-7)):
  - `MarkdownEditor.jsx`: custom editor, no new dependency. Toolbar (bold, italic, heading, bullet list, numbered list, quote, inline code, code block, link, image), Write/Preview toggle below `md`, side by side at `md` and up, paste and drag-drop upload with an `![Uploading name...]()` placeholder replaced by `![alt](/uploads/<name>)`, error alert on failure.
  - `markdownActions.js`: pure text transforms for the toolbar and placeholder handling.
  - `PostContent.jsx`: shared by the editor preview and `PostDetails`; `remark-gfm` ^4.0.1 (tables in a scroll wrapper, strikethrough, read-only task lists, bare-URL autolinks); still no `rehype-raw`, so raw HTML is escaped as text; lazy, responsive images.
  - `CreatePost.jsx` and `EditPost.jsx` use the editor and disable Save while uploads are pending; `PostCard.jsx` drops image Markdown, table pipes and task markers from the excerpt.
  - `services/uploadsAPI.js` (raw `File` post, type and 5 MB pre-check) and a `/uploads` proxy in `vite.config.js`.
- Changed from plan / additional fix: `db.js` now resolves a relative `DB_PATH` and the `.env` file against `backend/` instead of the current directory. Reason: an admin created from the repo root went into the wrong database and could not log in. Documented in [development.md](development.md) and [operations.md](operations.md). Not in PLAN.md.
- Verification:
  - Developer: backend curl-verified (their reported results; I did not see their run). Frontend: `npm run build` passed; `markdownActions` checked with Node; login, upload and fetch of `/uploads` through the Vite proxy with `curl` (reported, not seen by the docs pass). `npx eslint src` reports 42 errors (prop-types and unused React imports).
  - Docs pass (2026-10-05, throwaway DB and upload dir, cleaned up): unauthenticated upload 401 (also with a 6 MB body); PNG upload 201 with a UUID `.png` name and the file on disk; SVG sent as `image/svg+xml` 415; SVG sent as `image/png` 415; PNG bytes sent as `image/jpeg` 415; empty body 415; `application/json` body 415; 6 MB file 413 `Image too large (max 5 MB)`; `GET /uploads/<name>` 200 with `nosniff`, the CSP, `Cache-Control: public, max-age=31536000, immutable` and `Content-Type: image/png`; missing file JSON 404 with `nosniff` and CSP; `/uploads/` 404; `../blog.db` 403; `POST /uploads/x.png` 405. A relative `DB_PATH` run from the repo root created its file under `backend/`. Server with `DB_PATH=:memory:` started and created a `blogme-uploads-*` temp dir.
- Not verified:
  - Large unauthenticated upload buffering: only that the response is 401; memory use while a large body is sent was not measured.
  - Through Caddy: `request_body { max_size 6MB }` was never run against a real Caddy.
  - The `:memory:` temp-dir branch beyond starting the server (no upload through it).
  - Container (developer, Docker 29.8.1, dev override, reported): a PNG upload and fetch worked and the upload survived `docker compose down` (no `-v`) then `up -d`. Not seen: the base compose file, Caddy, ownership of `/app/data/uploads` checked separately.
  - Linux behaviour (everything above ran on Windows).
  - JPEG, GIF and WebP happy paths (only PNG was uploaded in the docs pass; the sniffing code was read).
  - GFM rendering (developer: `npm run build` and a server-side render of a sample with a table, `<del>`, disabled checkboxes, escaped raw `<script>`/`<b>` and a lazy responsive image, reported). Not seen in a browser: table scroll and divider styling, dark mode look.
  - In a browser (no browser was used): toolbar clicks and selection restore, paste and drag-drop, the image picker, placeholder replacement and the failure flow, preview and layout, Save disabled during an upload, images on the post page.
  - Backup and restore of `uploads/` (documented, commands unverified).
- Known gaps: no cleanup of orphaned images (not planned for v1); images are public by URL and keep EXIF data; `docker compose down -v` deletes uploads along with the database; `backup.js` does not include uploads, so the off-droplet copy must cover `uploads/` separately; no automated tests. Frontend: lint reports 42 errors (prop-types, unused React imports); selecting through a trailing newline does not include the following line in line-prefix actions (heading, lists, quote); the toolbar is hidden in Preview on narrow screens; images are not deleted when a post is deleted.

## Public read-only frontend (2026-10-11)

- Status: built; build and curl checks verified by a tester; browser click-through not done.
- Built: Login button (desktop) and Login drawer item (mobile) removed from `PublicNav.jsx`; nothing else links to `/login`. The `/login` route and the `adminOnly` redirect are unchanged, so `/login` is public but unlinked. `GetAllCategories.jsx` uses `isAdmin = Boolean(user)` (same result today). New `frontend/public/robots.txt` (`Disallow: /login`).
- Changed from plan: not in PLAN.md.
- Verification: `npm run build` passes; `robots.txt` lands in `dist/` and is served as `text/plain`; `GET /login` returns the SPA `index.html`; unauthenticated post create/update/delete, category create/update/delete, upload and `GET /user/profile` all return 401 (commands in [testing.md](testing.md#31-logged-out-read-only-checks)).
- Known gaps: no browser check; `robots.txt` on the droplet not checked; robots.txt does not strictly prevent indexing (a `noindex` meta on Login is not done). Later, owner's choice: Caddy IP allowlist or basicauth on the login endpoint; a separate admin build.

## Known gaps / next steps

1. Phase 4 follow-ups: measure image vulnerabilities (needs a scanner or a `docker scout` login), and run the Caddy network, `stop`/`restart` and backup pruning checks.
2. Browser click-through of Phase 3 (Markdown rendering, 404 page, redirects when logged out, logout, reload persistence, 429 message, mobile menu, and the full write/edit/delete scenario).
3. Lint cleanliness: `npm run lint` in `frontend/` reported 35 errors and 1 warning before Phase 7; the developer reports 42 errors after it (not re-run by the docs pass).
4. Restart-persistence check outside Docker (Phase 1 gap). The container check on the committed image is done.
5. Backup pruning (keep 14) has been read in code only; run it in a container, for example by running the script 15 times with different timestamps.
6. Phase 2 backend tests are skipped.
7. Phase 5 on the droplet: Caddy network name, swap for the build, cron, off-droplet backup copy, real restore.
8. Phase 7: click through the editor in a browser (toolbar, paste, drag-drop, picker, failure flow, preview, Save during upload, images on the post page), then the other unverified items listed under Phase 7 (Caddy, JPEG/GIF/WebP uploads).
9. Documentation upkeep: the 413/415/429 status codes and the partial `PUT /category/:id` are still missing from PLAN.md (reported, not edited).
