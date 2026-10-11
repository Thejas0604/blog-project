# BlogMe Lite documentation

Status (2026-10-11): a security hardening pass and a second fix pass for the re-audit findings were applied (uncommitted when documented); 17 backend tests pass; a final re-audit is recommended; see [security.md](security.md). Earlier status (2026-10-05): backend (Phase 1) verified by `curl`. Frontend (Phase 3) read from code; build verified, not clicked through in a browser. Container (Phase 4): the committed Dockerfile now builds (lead-confirmed); the full container checks were run earlier on an equivalent patched copy and are not re-run on the committed file. Phase 7 (Markdown editor and image uploads): backend done and curl-verified; frontend built and build-verified, editor not clicked through in a browser. Droplet (Phase 5) not started, so deploy steps there are unverified.

| Doc | What it covers |
|---|---|
| [architecture.md](architecture.md) | Components, request flow, frontend auth state, data model, auth flow, deployment topology, design decisions. |
| [writing-posts.md](writing-posts.md) | Owner's guide to the post editor: toolbar, Markdown, adding images, limits, Markdown cheat sheet. |
| [operations.md](operations.md) | Day-to-day running: start/stop, logs, health, admin and password reset, secret rotation, backup and restore (database and uploads), troubleshooting. |
| [deploy.md](deploy.md) | First-time droplet setup, Caddy snippet, environment, nightly backup cron (database and uploads), test restore. |
| [development.md](development.md) | Local setup (backend, frontend, Docker), env vars, tests, project layout, conventions. |
| [api/overview.md](api/overview.md) | Every endpoint: auth, request body, response keys, status codes, `curl`. |
| [testing.md](testing.md) | Step-by-step manual test checklist for the owner: backend curl, uploads, browser, editor, Docker, droplet, security, results log. Not yet run. |
| [security.md](security.md) | How to run a security audit, severity scale, report format, first-audit findings and their status, re-audit and fix pass 2, the final re-audit (2026-10-11: no Critical/High/Medium; open N1, N2, I-A to I-D, I-H to I-N), ordered next actions and the droplet verification checklist, re-audit procedure. |
| [milestones.md](milestones.md) | Status of each PLAN.md phase, what was built, how it was verified, known gaps. |

Start with [milestones.md](milestones.md) for what is done and the "Known gaps / next steps" list.

Source of truth: the API contract at the bottom of `/PLAN.md` for endpoints, and the code for behavior. Where they differ, see the Phase 1 and Phase 4 sections of [milestones.md](milestones.md).
