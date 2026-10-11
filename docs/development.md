# Development

Status (2026-10-05): backend commands run locally (Phase 1). Frontend scripts read from `frontend/package.json`; `npm run build` passes, lint does not (see below); `npm run dev` was not clicked through. Docker commands were run with a patched copy equivalent to the now-fixed Dockerfile; see [Docker](#docker-local).

## Prerequisites

- Node 22 or newer (`engines.node` is `>=22` in `backend/package.json`, matching `better-sqlite3@13.0.3`; the Docker image uses `node:22-slim`). Ran locally on Node 26.
- No MongoDB needed.

## Backend (`backend/`)

```sh
cd backend
cp .env.example .env     # set JWT_SECRET (required)
npm install
npm run dev              # node --watch src/index.js
npm start                # node src/index.js
```

The server refuses to start without `JWT_SECRET` (`JWT_SECRET is not set`). For local development (`NODE_ENV=development`, as in `backend/.env.example`, or `test`) any non-empty value works, for example `JWT_SECRET=change-me`. With any other `NODE_ENV`, including unset, the secret must be at least 32 characters and must have at least 8 distinct characters and must not look like a placeholder (`change-me`, `secret`, `password`, `jwt-secret`, `your-` prefixes are rejected). Generate one with `openssl rand -hex 32`.

Create the admin (username and email as arguments or prompted; the password comes from `ADMIN_PASSWORD` or a hidden prompt, never from an argument; at least 12 characters; does nothing if an admin already exists):

```sh
node src/scripts/createAdmin.js
```

Add sample data (test data only, needs the admin from the previous step; verified by running it against a scratch database on 2026-10-11):

```sh
npm run seed                  # same as: node src/scripts/seed.js
```

It adds 5 categories (JavaScript, DevOps, Databases, Web, Security) and 14 tech posts authored by the admin, one of them uncategorised. Posts use headings, code blocks, tables, task lists and quotes, with `created_at` spread over about two weeks. It is idempotent: categories are skipped by name and posts by title, and nothing is deleted or overwritten. First run printed `Seed done: 5 categories and 14 posts added.`, the second `0 categories and 0 posts added.` Without an admin it exits 1 with `No admin found. Run: node src/scripts/createAdmin.js`. It does not check `NODE_ENV`, so never run it on the droplet or against production data. Not verified: running it inside the container, and viewing the posts in a browser.

Try an upload (after logging in with a cookie jar, see [api/overview.md](api/overview.md#post-uploads)). Images go to `backend/data/uploads/`, which is git-ignored (`data` is in `backend/.gitignore`; confirmed with `git check-ignore`).

Run a backup (database only; writes to `<DB dir>/backups`, keeps 14):

```sh
node src/scripts/backup.js
```

The scripts load `.env` and open the database at `DB_PATH`; they do not need `JWT_SECRET`. A relative `DB_PATH` (and the `.env` file itself) is resolved against `backend/`, not the current directory, so the server and the scripts open the same database wherever you run them from (seen: `DB_PATH=./data2/blog.db node backend/src/scripts/createAdmin.js` run from the repo root created the file under `backend/data2/`). Before this fix, an admin created from the repo root went into a different database and could not log in. They print a dotenv line such as `injected env (0) from .env`; it is harmless.

### Environment variables

From `backend/.env.example`:

| Variable | Purpose | Notes |
|---|---|---|
| `PORT` | Listen port | Default 3000. |
| `JWT_SECRET` | Signs JWTs | Required in every environment (empty in the example file, so you must fill it). Unless `NODE_ENV` is `development` or `test`: at least 32 characters, at least 8 distinct characters, and not a placeholder. Generate with `openssl rand -hex 32`. Never commit real values. |
| `DB_PATH` | SQLite file | Default `./data/blog.db`, resolved against `backend/`; the directory is created. `:memory:` is allowed by `db.js` (no persistence). |
| `UPLOAD_DIR` | Where uploaded images are stored | Optional, commented out in the example. Must not contain the DB directory, and must not be or lie inside `<DB dir>/backups` (the server refuses to start). Default `uploads/` next to the DB file (`backend/data/uploads` locally, `/app/data/uploads` in the container). A relative value resolves against `backend/`. With `DB_PATH=:memory:` and no `UPLOAD_DIR`, a temp directory is used. |
| `TRUST_PROXY` | Express `trust proxy` | Optional, default `1` (one hop, Caddy). A number of hops, or an IP/subnet string such as `172.18.0.0/16`. Use `0` when nothing proxies the app, so `X-Forwarded-For` is ignored. |
| `CLIENT_ORIGIN` | Allowed CORS origin in dev | `cors` is loaded only when `NODE_ENV` is `development` or `test`. Example `http://localhost:5173`. |
| `NODE_ENV` | Only `development` and `test` are non-production: anything else (including unset) makes the cookie `Secure`, disables CORS and enforces the secret checks | The example file uses `development`. In Docker Compose it is set by the compose files, not by `.env`: `production` in `docker-compose.yml` (wins over `env_file`), `development` in `docker-compose.dev.yml`. |
| `ADMIN_PASSWORD` | Password for `createAdmin.js` | Read only by that script; leave unset to get a hidden prompt. Not for `.env`. |

No admin credentials belong in `.env`. Local `data/` (database, backups, uploads), `*.db*` and `.env` are git-ignored in `backend/.gitignore`.

## Frontend (`frontend/`)

Phase 7 frontend (Markdown editor and image upload UI) is built; `npm run build` passes. The editor was not clicked through in a browser (see [writing-posts.md](writing-posts.md)).

```sh
cd frontend
npm install
npm run dev        # Vite dev server, http://localhost:5173
npm run build      # writes frontend/dist (verified)
npm run lint       # eslint . (currently fails, see below)
npm test           # node --test on mermaidUtils.test.js (5 tests)
npm run preview
```

Run the backend (`npm run dev` in `backend/`, port 3000) in a second terminal. Vite proxies `/api` and `/uploads` to `http://localhost:3000` (`vite.config.js`), so the browser sees one origin and the cookie works without CORS. The frontend has no `.env` file by default.

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Optional prefix for the API (`baseURL = (VITE_API_URL ?? "") + "/api/v1"`). Leave unset for the proxy (dev) and same-origin (production). |

Notes:

- `axiosInstance` (`src/utils/axiosInstance.js`) is the only HTTP client; all calls go through `src/services/*.js`. It sends cookies (`withCredentials`) and logs the UI out on any 401.
- `@emotion/react` and `@emotion/styled` were added to `package.json` because the build failed without them (MUI needs them).
- Editor files in `src/components/posts/`:
  - `MarkdownEditor.jsx`: custom component (no new editor dependency; MUI and `react-markdown` were already used; `remark-gfm` ^4.0.1 was added for tables, strikethrough, task lists and autolinks). Props `value`, `onChange`, `onBusyChange`, `disabled`. Toolbar, Write/Preview toggle (below `md`) or side by side (`md` and up), paste and drag-drop upload.
  - `markdownActions.js`: pure text transforms (`bold`, `italic`, `heading`, lists, `quote`, `inlineCode`, `codeBlock`, `link`, `insertAt`, `uploadingToken`, `replaceToken`, `safeAlt`). No React, so it can be checked in Node.
  - `PostContent.jsx`: the one Markdown renderer, used by the editor preview and `PostDetails`. No `rehype-raw`; images are lazy and capped to the column width.
  - `CreatePost.jsx` and `EditPost.jsx` use the editor and disable Save while it reports a pending upload. `PostCard.jsx` drops image Markdown from the list excerpt.
  - `src/services/uploadsAPI.js`: `uploadImage(file)` posts the raw `File` to `/uploads` with its own `Content-Type`; checks type and 5 MB first.
- Mermaid (uncommitted when documented): `MermaidDiagram.jsx` renders `mermaid` fenced blocks (lazy `import("mermaid")`, `securityLevel: 'strict'`, 400 ms delay, source fallback); `mermaidUtils.js` holds the pure helpers; `PostContent.jsx` overrides `pre` only for `language-mermaid`. Dependency policy: `mermaid` is pinned to an exact version in `package.json` (`11.17.2`, no `^`). Bump with `npm install --save-exact mermaid@<version>` and check it as described in [security.md](security.md#mermaid-diagrams-frontend). It adds a large separate chunk to `dist/` (developer-reported, about 696 KB / 172 KB gzip for `mermaid.core`).
- Lint: `npm run lint` (`npx eslint src`) reported 35 errors and 1 warning on 2026-10-05 before Phase 7, and 42 errors after it, per the developer (not re-run by the docs pass). They are `react/prop-types` and unused `React` imports; the build does not depend on lint. The developer reports about 44 errors now, 3 of the same kind from `MermaidDiagram.jsx` (not re-run by the docs pass).
- Not clicked through in a browser: Markdown rendering, 404 page, route redirects, logout button, reload persistence, the 429 message, the mobile menu, and everything in the editor (toolbar, selection restore, paste, drag-drop, image picker, preview and layout, Save disabled during upload, images on the post page).

## Docker (local)

Compose reads the root `.env`, not `backend/.env`. Copy the root example:

```sh
cp .env.example .env        # then set JWT_SECRET (openssl rand -hex 32)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
curl http://localhost:3000/health
```

- Do not copy `backend/.env.example` to the root: its `DB_PATH=./data/blog.db` would override the image's `/app/data/blog.db`. `NODE_ENV` in `.env` is ignored for the `blog` service because the compose files set it explicitly.
- `docker-compose.yml` forces `NODE_ENV=production` (secure cookie, no CORS, strict secret checks). `docker-compose.dev.yml` sets `NODE_ENV=development`, so the dev container uses a non-Secure cookie, CORS (with `CLIENT_ORIGIN`) and relaxed `JWT_SECRET` checks. **Never use the dev file on the server.** What it changes (read from the files; final-audit finding N2 in [security.md](security.md#n2-docker-composedevyml-is-unsafe-outside-a-local-machine), open): non-Secure cookie and skipped `JWT_SECRET` checks; with `CLIENT_ORIGIN` unset, CORS answers `Access-Control-Allow-Origin: *` (so any site can read the public GET API of that instance); `TRUST_PROXY` stays `1` with no proxy, so `X-Forwarded-For` can be spoofed to dodge the login limiter; and it does not rename the project or volume, so in the same directory as the production stack it would mount the production `blog-data` volume. Set `CLIENT_ORIGIN` in `.env` for local use. Read from the compose files; the running container's value was not checked by the docs pass (unverified).
- `docker-compose.dev.yml` is for local testing only: it publishes `127.0.0.1:3000` and resets the private `blog-net` network so the service uses the default one. It needs Compose v2.24 or newer (`!override` and `!reset`; verified on Compose v5.5.1 before the rename to `blog-net`; `docker compose config` on the new files was reported by the developer). Without it, `docker-compose.yml` creates the internal `blog-net` network (no outbound internet, no published port), so the app is unreachable from the host (not run).
- The image serves the built frontend and the API on port 3000. With the base compose file alone (`NODE_ENV=production`) the cookie is `Secure`; with the dev override it is not, so login works over `http://localhost:3000` (not tried in a browser).
- Create the admin: `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -it blog node src/scripts/createAdmin.js` (hidden password prompt).
- Sample data (local only): `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec blog npm run seed` (or `node src/scripts/seed.js`), after creating the admin. Rebuild with `up --build` first so the image includes the script. Verified 2026-10-11 in a throwaway container (admin created, seed added 5 categories and 14 posts, second run added 0, `npm run seed` works, `/api/v1/posts` and `/api/v1/category` returned the data).
- The Dockerfile installs with `npm ci --omit=dev --ignore-scripts` (see [milestones.md](milestones.md#phase-4-containerize)). On Windows Git Bash, paths like `/app/data` passed to `docker compose exec` are rewritten; wrap the command in `sh -c '...'`.

## Tests

Manual, step-by-step checks for the whole app (not yet run) are in [testing.md](testing.md).

Automated backend tests (added in the 2026-10-11 security pass; 17 tests, all passing when run by the docs pass):

```sh
cd backend
npm install     # supertest is a devDependency
npm test        # node --test "test/*.test.js"
```

They use `node:test` and `supertest` with `DB_PATH=:memory:` and `NODE_ENV=test` (`test/helpers.js` sets this before loading the app). Files: `auth.test.js` (requireAdmin, logout revocation, headers, `Secure` cookie off in test and on in production), `limiter.test.js` (per-IP, IPv6 /64, global cap with the known-good exemption), `trustProxy.test.js`, `config.test.js` (`JWT_SECRET` checks including the distinct-character rule, migration, `UPLOAD_DIR` guard including the backups directory). They cover security behavior only, not the full API; the Phase 2 coverage list is still mostly manual. Frontend: `npm test` in `frontend/` runs `node --test src/components/posts/mermaidUtils.test.js` (5 tests for `getCodeLanguage`, `isMermaidClass`, `childrenToText` and `hasMermaidConfig`; all pass, seen by the docs pass on 2026-10-11). They cover only those pure helpers; there are no component or browser tests. Security review process: [security.md](security.md).

## Project layout (`backend/`)

```
src/index.js               starts the app on PORT
src/app.js                 express app, middleware order, error handler, /health
src/db.js                  better-sqlite3 connection, pragmas, schema, SIGTERM close; resolves DB_PATH and .env against backend/
src/uploadDir.js           resolves and creates the uploads directory
src/serialize.js           DB row to API shape (_id, categoryName, ...)
src/env.js                 isDevLike(): true only for NODE_ENV development or test
src/middleware/auth.js     requireAuth, requireAdmin, userFromCookie, cookie helpers, fail(status, message)
src/middleware/http.js     requireJson (415), parseId (positive integer or null)
src/routes/                user.js (login, logout, profile, rate limit), posts.js, categories.js, uploads.js (raw image upload)
src/scripts/               createAdmin.js, backup.js, seed.js (test data only)
test/                      node:test + supertest tests (npm test)
```

Other top-level items:

```
frontend/                  React app (Vite). src/App.jsx routes, src/context/AuthContext.jsx,
                           src/utils/axiosInstance.js, src/services/*API.js (incl. uploadsAPI.js), src/components/{auth,posts,categories,navbar,home}
                           posts/ holds MarkdownEditor.jsx, markdownActions.js, PostContent.jsx,
                           MermaidDiagram.jsx, mermaidUtils.js (+ mermaidUtils.test.js)
Dockerfile                 stage 1 builds frontend, stage 2 runs backend with the build in public/
docker-compose.yml         service `blog`, volume `blog-data`, private internal network `blog-net`, cap_drop ALL, no-new-privileges
docker-compose.dev.yml     local override: publishes 127.0.0.1:3000
.dockerignore, .env.example (root; used by compose), Caddyfile.snippet
```

`backend/src/app.js` serves `backend/public/` (the built frontend) only if `public/index.html` exists; the Docker image provides it, local dev does not.

## Conventions

- Parameterized SQL only (prepared statements); no ORM.
- API field names are Mongo-style (`_id`, `categoryName`); do not rename them in the frontend. Map them only in `serialize.js`.
- Set `updated_at` explicitly on every UPDATE (no trigger).
- Errors: throw `fail(status, message)` (from `middleware/auth.js`); the error handler in `app.js` returns `{ status: "fail", message }`. 500s are logged and return a generic message.
- Writes use `requireAuth`, `requireAdmin`, then `requireJson`; URL ids go through `parseId` so bad ids are 404.
- Never commit secrets; `.env` stays in `.gitignore`.
- One commit per phase.
- Frontend: call the API only through `src/services/*` and `axiosInstance`; do not store tokens or user data in `localStorage`; keep API field names as the server returns them.
