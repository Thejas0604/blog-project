# BlogMe

A minimal single-author blog: an Express API on SQLite, a React (MUI) frontend, designed to run as one Docker container behind Caddy. Only the owner can log in, write, edit and delete posts and categories, and upload images (PNG, JPEG, GIF, WebP, max 5 MB; backend verified with `curl`; editor UI built but not clicked through in a browser); visitors read.

The build plan is in [PLAN.md](PLAN.md). The original MongoDB backend was removed and is only in git history.

## Quick start (backend, local)

```sh
cd backend
cp .env.example .env          # set JWT_SECRET (required)
npm install
node src/scripts/createAdmin.js   # hidden password prompt; or ADMIN_PASSWORD='...' node src/scripts/createAdmin.js <username> <email>
npm run seed                  # optional sample posts (same as node src/scripts/seed.js); test data only, never in production
npm run dev
curl http://localhost:3000/health
npm test                      # 17 backend security tests
```

With `NODE_ENV=development` (as in `backend/.env.example`) any non-empty `JWT_SECRET` works; otherwise it must be 32+ characters, have 8+ distinct characters and not be a placeholder (`openssl rand -hex 32`).

## Quick start (frontend, local)

```sh
cd frontend
npm install
npm run dev          # http://localhost:5173, proxies /api and /uploads to localhost:3000
```

Run the scripts from any directory: a relative `DB_PATH` and `.env` resolve against `backend/`.

Back up the whole `blog-data` volume (database backups and `uploads/`); see [docs/operations.md](docs/operations.md#backup-and-verify).

## Docker

```sh
cp .env.example .env     # set JWT_SECRET; use the root file, not backend/.env.example
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build   # local test, port 3000
```

Status: the `Dockerfile` uses `node:22-slim` in both stages and `npm ci --omit=dev --ignore-scripts`. The developer ran the container checks on it (Docker 29.8.1, dev override: build, `/health`, admin, login cookie, upload, backup, data kept across `down` then `up -d`). Not verified: Caddy, the droplet, a Linux host, image vulnerability counts. Open items are in [docs/milestones.md](docs/milestones.md#phase-4-containerize). The frontend was built and its login flow checked via `curl`, but not clicked through in a browser. The droplet deployment (Phase 5) has not started. The container sits on a private internal Docker network `blog-net`; Caddy must be attached to it (see [docs/deploy.md](docs/deploy.md#caddy-snippet)).

## Documentation

All docs are in [docs/](docs/README.md):

- [Writing posts](docs/writing-posts.md)
- [Architecture](docs/architecture.md)
- [API overview](docs/api/overview.md)
- [Development](docs/development.md)
- [Operations](docs/operations.md)
- [Deploy](docs/deploy.md)
- [Manual testing guide](docs/testing.md)
- [Security testing and findings](docs/security.md)
- [Milestones](docs/milestones.md)
