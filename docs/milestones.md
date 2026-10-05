# Milestones

One section per phase of `/PLAN.md`. A phase is "done" only when its "Done when" checks were seen to pass.

| Phase | Name | Status |
|---|---|---|
| 0 | API contract | done |
| 1 | SQLite backend | done |
| 2 | Backend tests | skipped by owner for now |
| 3 | Frontend trim and wiring | built, build verified; UI click-through not done (not done) |
| 4 | Containerize | files written; Dockerfile builds; container checks not re-run on committed file (not done) |
| 5 | Deploy on the droplet | not started |
| 6 | Optional additions | not started |

## Phase 0: API contract

- Status: done
- Date: 2026-10-05 (docs pass date; exact completion date unverified)
- Built: API contract table at the bottom of PLAN.md, produced by the architect review. Verified in the frontend code: `CreatePost.jsx` sends a category `_id`; `EditPost.jsx` sends only `{ title, content }`; no post component reads `post.category`; `CategoryCard.jsx` reads `category.posts?.length`.
- Changed from plan: none known.
- Verification: architect review per PLAN.md. I did not re-run the check against `frontend/src/services/` (unverified by docs).
- Known gaps: the Phase 3 screen list is the "Frontend changes" list in PLAN.md. The old `docs/api/overview.md` described the Mongo-era API (`/categories`, register, `email` login) and was rewritten; the contract uses `/category`.

## Phase 1: SQLite backend (`backend-lite/`)

- Status: done (developer verified; docs pass re-ran the checks below)
- Date: 2026-10-05 (no git commit for `backend-lite/` existed when this was written; it is untracked)
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
  - Docs pass: the frontend built inside the Docker build stage (stage 1 completed on `node:20-slim` and on `node:22-slim`). `npm run lint` was run: 35 errors, 1 warning (mostly `react/prop-types`, an unused `React` import in `PostDetails.jsx`, a fast-refresh warning in `AuthContext.jsx`).
  - Not verified in a browser: Markdown rendering, 404 page, route redirects when logged out, logout button, login persisting across a reload, the 429 message, the mobile menu, and the full "log in, write, see it logged out, edit, delete" scenario.
- Known gaps: the click-through above; lint errors; the mobile drawer is marked "have to optimize" in the code; `PostDetails` does a second request to fetch the category name (works because the API returns the category id).

## Phase 4: Containerize

- Status: files written; the committed Dockerfile builds now (lead-confirmed, see below); the full container checks used an equivalent patched copy; not done by the PLAN.md definition
- Date: 2026-10-05
- Built: `Dockerfile` (stage 1 builds the frontend on `node:20-slim`; stage 2 runs `backend-lite` with `NODE_ENV=production`, `DB_PATH=/app/data/blog.db`, `PORT=3000`, frontend copied to `/app/public`, `USER node`, `/app/data` chowned to `node`); `docker-compose.yml` (service `blog`, `init: true`, `restart: unless-stopped`, `env_file: .env`, volume `blog-data` at `/app/data`, `mem_limit: 300m`, no published ports, external network `${CADDY_NETWORK:-caddy}` with alias `blog`); `docker-compose.dev.yml` (publishes `127.0.0.1:3000`, replaces the network; needs Compose v2.24+); `.dockerignore`; `Caddyfile.snippet`; root `.env.example` (`JWT_SECRET`, optional `CADDY_NETWORK`); and in `backend-lite/src/app.js` a JSON 404 for unknown `/api/*` paths, then static serving of `public/` and a `GET *` fallback to `index.html`, both only if `public/index.html` exists.
- Changed from plan: none known. Compose must use the root `.env.example`; `backend-lite/.env.example` would override `NODE_ENV` and `DB_PATH` in the container.
- Defect found and fixed (docs pass, Docker Desktop 4.93, Compose v5.5.1): `docker build .` failed at `RUN npm ci --omit=dev` in stage 2. The Dockerfile line 16-17 now reads `RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force` (with a comment). The lead rebuilt the committed Dockerfile on `node:20-slim` and confirmed `docker build` succeeds and `require('better-sqlite3')` works in the container (reported by the lead; I did not re-run it). The cause: `better-sqlite3@13.0.3` has no install script and ships prebuilt binaries in the package (`prebuilds/linux-x64.node`), but npm runs `node-gyp rebuild` by default when a `binding.gyp` exists, and `node:*-slim` has no Python or compiler (`gyp ERR! find Python`). Switching to `node:22-slim` alone does not help. The fix was first verified in a scratch copy (my own run): with `--ignore-scripts` the image built on `node:22-slim` and on `node:20-slim`, and `require('better-sqlite3')` worked in both. Related: `better-sqlite3@13.0.3` declares `engines.node >=22` (npm prints `EBADENGINE` on Node 20) while `backend-lite/package.json` says `>=20` and the Dockerfile uses Node 20. Application code and the Dockerfile were not modified by the docs pass.
- Verification of the container checks below: they ran earlier on a patched override equivalent to the fix now committed (`node:22-slim` plus `--ignore-scripts`, used through an override file; dev compose files, project name `blogdocs`, all cleaned up afterwards):
  - Container user is `uid=1000(node)`; `/app/data` is owned by `node`; `NODE_ENV=production`, `DB_PATH=/app/data/blog.db`.
  - `/health` returned `{"status":"ok"}` on `localhost:3000`; `/` and `/posts/1` returned `200 text/html` (SPA fallback); `/api/v1/nope` returned the JSON 404; `GET /api/v1/posts` returned the empty list.
  - `createAdmin.js` created the admin in the container; login returned 200 with `HttpOnly; Secure; SameSite=Lax; Max-Age=604800`; a post was created with that cookie.
  - `backup.js` wrote `/app/data/backups/blog-<stamp>.db`; `docker compose cp` copied it out; on the host it showed 1 post and `integrity_check: ok`.
  - Data survived `docker compose up -d --force-recreate` (the same post, and the old cookie still returned the profile). `docker compose down` followed by `up` was not run as such (a first attempt was blocked by the tool's safety check); the final cleanup `down --volumes` ran. A recreate keeps the named volume exactly as `down`/`up` does, but the PLAN.md wording was not literally exercised.
  - Idle memory about 20 MiB of the 300 MiB limit.
  - Both compose files merged correctly with `docker compose config` on Compose v5.5.1.
- Not verified: the runtime checks above against the committed Dockerfile (Node 20 base; only the build and the `better-sqlite3` load were confirmed, by the lead); `docker compose up` with the base file and a real external Caddy network; the `CADDY_NETWORK` override; `stop`/`restart`; the `Secure` cookie over `http://localhost` in a browser; the 14-file backup pruning.
- Known gaps:
  - Engines mismatch: `backend-lite/package.json` says `>=20`, `better-sqlite3` requires `>=22`, and the Dockerfile uses Node 20.
  - The IDE scanner reports 5 critical and 52 high vulnerabilities on the `node:20-slim` base image (unverified which packages). Node 20 is past end of life; consider `node:22-slim`, which I verified builds with the fix.
  - The PLAN.md "Done when" is not met until the runtime checks are re-run with the committed files.

## Phase 5: Deploy on the droplet

- Status: not started. It happens on the droplet (Caddy, DNS, cron, HTTPS), outside this repo. See [deploy.md](deploy.md); nothing in it was run on the droplet.

## Phase 6: Optional later additions

- Status: not started. Not in the v1 build.

## Known gaps / next steps

1. Re-run the Phase 4 checks with the committed Dockerfile (it builds now), including a literal `docker compose down` then `up`. Decide on `node:22-slim` (Node 20 is EOL, scanner flags the base image) and whether `backend-lite/package.json` `engines` should say `>=22`.
2. Browser click-through of Phase 3 (Markdown rendering, 404 page, redirects when logged out, logout, reload persistence, 429 message, mobile menu, and the full write/edit/delete scenario).
3. Lint cleanliness: `npm run lint` in `frontend/` reports 35 errors and 1 warning.
4. Restart-persistence check outside Docker (Phase 1 gap) and in the container with the committed image.
5. Backup pruning (keep 14) has been read in code only; run it in a container, for example by running the script 15 times with different timestamps.
6. Phase 2 backend tests are skipped.
7. Phase 5 on the droplet: Caddy network name, swap for the build, cron, off-droplet backup copy, real restore.
8. Documentation upkeep: the 413/415/429 status codes and the partial `PUT /category/:id` are still missing from PLAN.md (reported, not edited).
