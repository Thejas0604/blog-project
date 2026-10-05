# Development

Status (2026-10-05): backend commands run locally (Phase 1). Frontend scripts read from `frontend/package.json`; `npm run build` passes, lint does not (see below); `npm run dev` was not clicked through. Docker commands were run with a patched copy equivalent to the now-fixed Dockerfile; see [Docker](#docker-local).

## Prerequisites

- Node 22 or newer (`engines.node` is `>=22` in `backend-lite/package.json`, matching `better-sqlite3@13.0.3`; the Docker image uses `node:22-slim`). Ran locally on Node 26.
- No MongoDB needed.

## Backend (`backend-lite/`)

```sh
cd backend-lite
cp .env.example .env     # set JWT_SECRET (required)
npm install
npm run dev              # node --watch src/index.js
npm start                # node src/index.js
```

The server refuses to start without `JWT_SECRET` (`JWT_SECRET is not set`). For development, any non-empty value works, for example `JWT_SECRET=change-me`. In production it must be at least 32 characters.

Create the admin (CLI args, or no args for an interactive prompt; password at least 12 characters; does nothing if an admin already exists):

```sh
node src/scripts/createAdmin.js
```

Try an upload (after logging in with a cookie jar, see [api/overview.md](api/overview.md#post-uploads)). Images go to `backend-lite/data/uploads/`, which is git-ignored (`data` is in `backend-lite/.gitignore`; confirmed with `git check-ignore`).

Run a backup (database only; writes to `<DB dir>/backups`, keeps 14):

```sh
node src/scripts/backup.js
```

The scripts load `.env` and open the database at `DB_PATH`; they do not need `JWT_SECRET`. A relative `DB_PATH` (and the `.env` file itself) is resolved against `backend-lite/`, not the current directory, so the server and the scripts open the same database wherever you run them from (seen: `DB_PATH=./data2/blog.db node backend-lite/src/scripts/createAdmin.js` run from the repo root created the file under `backend-lite/data2/`). Before this fix, an admin created from the repo root went into a different database and could not log in. They print a dotenv line such as `injected env (0) from .env`; it is harmless.

### Environment variables

From `backend-lite/.env.example`:

| Variable | Purpose | Notes |
|---|---|---|
| `PORT` | Listen port | Default 3000. |
| `JWT_SECRET` | Signs JWTs | Required in every environment (empty in the example file, so you must fill it). At least 32 characters when `NODE_ENV=production`. Generate with `openssl rand -hex 32`. Never commit real values. |
| `DB_PATH` | SQLite file | Default `./data/blog.db`, resolved against `backend-lite/`; the directory is created. `:memory:` is allowed by `db.js` (no persistence). |
| `UPLOAD_DIR` | Where uploaded images are stored | Optional, commented out in the example. Default `uploads/` next to the DB file (`backend-lite/data/uploads` locally, `/app/data/uploads` in the container). A relative value resolves against `backend-lite/`. With `DB_PATH=:memory:` and no `UPLOAD_DIR`, a temp directory is used. |
| `CLIENT_ORIGIN` | Allowed CORS origin in dev | `cors` is loaded only when `NODE_ENV` is not `production`. Example `http://localhost:5173`. |
| `NODE_ENV` | `production` makes the cookie `Secure`, disables CORS, enforces the 32 character secret | The example file uses `development`. |

No admin credentials belong in `.env`. Local `data/` (database, backups, uploads), `*.db*` and `.env` are git-ignored in `backend-lite/.gitignore`.

## Frontend (`frontend/`)

Phase 7 frontend (Markdown editor and image upload UI) is built; `npm run build` passes. The editor was not clicked through in a browser (see [writing-posts.md](writing-posts.md)).

```sh
cd frontend
npm install
npm run dev        # Vite dev server, http://localhost:5173
npm run build      # writes frontend/dist (verified)
npm run lint       # eslint . (currently fails, see below)
npm run preview
```

Run the backend (`npm run dev` in `backend-lite/`, port 3000) in a second terminal. Vite proxies `/api` and `/uploads` to `http://localhost:3000` (`vite.config.js`), so the browser sees one origin and the cookie works without CORS. The frontend has no `.env` file by default.

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
- Lint: `npm run lint` (`npx eslint src`) reported 35 errors and 1 warning on 2026-10-05 before Phase 7, and 42 errors after it, per the developer (not re-run by the docs pass). They are `react/prop-types` and unused `React` imports; the build does not depend on lint.
- Not clicked through in a browser: Markdown rendering, 404 page, route redirects, logout button, reload persistence, the 429 message, the mobile menu, and everything in the editor (toolbar, selection restore, paste, drag-drop, image picker, preview and layout, Save disabled during upload, images on the post page).

## Docker (local)

Compose reads the root `.env`, not `backend-lite/.env`. Copy the root example:

```sh
cp .env.example .env        # then set JWT_SECRET (openssl rand -hex 32)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
curl http://localhost:3000/health
```

- Do not copy `backend-lite/.env.example` to the root: it sets `NODE_ENV=development` and `DB_PATH=./data/blog.db`, which would override the image's `production` and `/app/data/blog.db`.
- `docker-compose.dev.yml` is for local testing only: it publishes `127.0.0.1:3000` and replaces the external Caddy network with the default one. It needs Compose v2.24 or newer (`!override` and `!reset`; verified on Compose v5.5.1). Without it, `docker-compose.yml` is expected to fail because the external `caddy` network does not exist locally (not run).
- The image serves the built frontend and the API on port 3000. With `NODE_ENV=production` the cookie is `Secure`; browsers accept it on `http://localhost`, but this was not tried in a browser.
- Create the admin: `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -it blog node src/scripts/createAdmin.js`.
- The Dockerfile installs with `npm ci --omit=dev --ignore-scripts` (see [milestones.md](milestones.md#phase-4-containerize)). On Windows Git Bash, paths like `/app/data` passed to `docker compose exec` are rewritten; wrap the command in `sh -c '...'`.

## Tests

Phase 2 is skipped for now. `backend-lite/package.json` has no `test` script, so `npm test` does not exist. Phase 1 was verified by manual `curl` runs (see [milestones.md](milestones.md#phase-1-sqlite-backend-backend-lite)). Planned: `node --test` with `supertest` and `DB_PATH=:memory:`.

## Project layout (`backend-lite/`)

```
src/index.js               starts the app on PORT
src/app.js                 express app, middleware order, error handler, /health
src/db.js                  better-sqlite3 connection, pragmas, schema, SIGTERM close; resolves DB_PATH and .env against backend-lite/
src/uploadDir.js           resolves and creates the uploads directory
src/serialize.js           DB row to API shape (_id, categoryName, ...)
src/middleware/auth.js     requireAuth, cookie helpers, fail(status, message)
src/middleware/http.js     requireJson (415), parseId (positive integer or null)
src/routes/                user.js (login, logout, profile, rate limit), posts.js, categories.js, uploads.js (raw image upload)
src/scripts/               createAdmin.js, backup.js
```

Other top-level items:

```
frontend/                  React app (Vite). src/App.jsx routes, src/context/AuthContext.jsx,
                           src/utils/axiosInstance.js, src/services/*API.js (incl. uploadsAPI.js), src/components/{auth,posts,categories,navbar,home}
                           posts/ holds MarkdownEditor.jsx, markdownActions.js, PostContent.jsx
Dockerfile                 stage 1 builds frontend, stage 2 runs backend-lite with the build in public/
docker-compose.yml         service `blog`, volume `blog-data`, external Caddy network
docker-compose.dev.yml     local override: publishes 127.0.0.1:3000
.dockerignore, .env.example (root; used by compose), Caddyfile.snippet
backend/                   original Mongo version, not modified, not built
```

`backend-lite/src/app.js` serves `backend-lite/public/` (the built frontend) only if `public/index.html` exists; the Docker image provides it, local dev does not.

## Conventions

- Parameterized SQL only (prepared statements); no ORM.
- API field names are Mongo-style (`_id`, `categoryName`); do not rename them in the frontend. Map them only in `serialize.js`.
- Set `updated_at` explicitly on every UPDATE (no trigger).
- Errors: throw `fail(status, message)` (from `middleware/auth.js`); the error handler in `app.js` returns `{ status: "fail", message }`. 500s are logged and return a generic message.
- Writes use `requireAuth` then `requireJson`; URL ids go through `parseId` so bad ids are 404.
- Never commit secrets; `.env` stays in `.gitignore`.
- One commit per phase.
- Frontend: call the API only through `src/services/*` and `axiosInstance`; do not store tokens or user data in `localStorage`; keep API field names as the server returns them.
