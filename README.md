# BlogMe Lite

A minimal single-author blog: an Express API on SQLite, a React (MUI) frontend, designed to run as one Docker container behind Caddy. Only the owner can log in, write, edit and delete posts and categories; visitors read.

The original MongoDB version is kept in `backend/` and is not part of the lite build. The build plan is in [PLAN.md](PLAN.md).

## Quick start (backend, local)

```sh
cd backend-lite
cp .env.example .env          # set JWT_SECRET (required)
npm install
node src/scripts/createAdmin.js
npm run dev
curl http://localhost:3000/health
```

## Quick start (frontend, local)

```sh
cd frontend
npm install
npm run dev          # http://localhost:5173, proxies /api to localhost:3000
```

## Docker

```sh
cp .env.example .env     # set JWT_SECRET; use the root file, not backend-lite/.env.example
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build   # local test, port 3000
```

Status: the `Dockerfile` now builds (it uses `npm ci --omit=dev --ignore-scripts`; reported by the lead, the full container checks ran earlier on an equivalent patched copy). Open items are in [docs/milestones.md](docs/milestones.md#phase-4-containerize). The frontend was built and its login flow checked via `curl`, but not clicked through in a browser. The droplet deployment (Phase 5) has not started.

## Documentation

All docs are in [docs/](docs/README.md):

- [Architecture](docs/architecture.md)
- [API overview](docs/api/overview.md)
- [Development](docs/development.md)
- [Operations](docs/operations.md)
- [Deploy](docs/deploy.md)
- [Milestones](docs/milestones.md)
