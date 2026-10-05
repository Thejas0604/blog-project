# BlogMe Lite documentation

Status (2026-10-05): backend (Phase 1) verified by `curl`. Frontend (Phase 3) read from code; build verified, not clicked through in a browser. Container (Phase 4): the committed Dockerfile now builds (lead-confirmed); the full container checks were run earlier on an equivalent patched copy and are not re-run on the committed file. Droplet (Phase 5) not started, so deploy steps there are unverified.

| Doc | What it covers |
|---|---|
| [architecture.md](architecture.md) | Components, request flow, frontend auth state, data model, auth flow, deployment topology, design decisions. |
| [operations.md](operations.md) | Day-to-day running: start/stop, logs, health, admin and password reset, secret rotation, backup and restore, troubleshooting. |
| [deploy.md](deploy.md) | First-time droplet setup, Caddy snippet, environment, nightly backup cron, test restore. |
| [development.md](development.md) | Local setup (backend, frontend, Docker), env vars, tests, project layout, conventions. |
| [api/overview.md](api/overview.md) | Every endpoint: auth, request body, response keys, status codes, `curl`. |
| [milestones.md](milestones.md) | Status of each PLAN.md phase, what was built, how it was verified, known gaps. |

Start with [milestones.md](milestones.md) for what is done and the "Known gaps / next steps" list.

Source of truth: the API contract at the bottom of `/PLAN.md` for endpoints, and the code for behavior. Where they differ, see the Phase 1 and Phase 4 sections of [milestones.md](milestones.md).
