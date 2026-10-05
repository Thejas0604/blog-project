# Operations

Run from the project directory on the droplet. First-time setup: [deploy.md](deploy.md).

Verification status (2026-10-05): the Node scripts and server behavior were run locally against a throwaway database (Phase 1). The container commands below were run on Docker Desktop (Compose v5.5.1) using the repo's compose files with a patched copy of the Dockerfile equivalent to the committed one (`--ignore-scripts`). The committed Dockerfile now builds (confirmed by the lead; not re-run by the docs pass). See [milestones.md](milestones.md#phase-4-containerize). Commands that were not run are marked "unverified". The droplet itself (Caddy, cron) is Phase 5 and not done.

Compose reads `.env` in the project root (copy the root `.env.example`, not `backend-lite/.env.example`). On the droplet the commands are plain `docker compose ...`. For a local test add `-f docker-compose.yml -f docker-compose.dev.yml` (see [development.md](development.md#docker-local)).

## Start, stop, restart, update

```sh
docker compose up -d --build     # start / rebuild
docker compose stop              # stop
docker compose restart blog      # restart
git pull && docker compose up -d --build   # update
docker compose ps
```

Run on a laptop: `up -d --build`, `ps` (Up, port bound), recreate (`up -d --force-recreate`) and data persistence were seen to work. `stop`, `restart`, `git pull` and the update flow were not run (unverified). `docker compose down` (without `-v`) keeps the `blog-data` volume; `down -v` deletes the database, so never use `-v` on the server.

Note: building the frontend on a 2 GB droplet is tight; add swap or build elsewhere (PLAN.md Phase 4; not tried).

Stop is graceful: `db.js` closes the database on SIGTERM.

## Logs and health

```sh
docker compose logs -f --tail=100 blog
curl -s https://blog.<domain>/health         # expected: {"status":"ok"}
```

`/health` only shows the process is up; it does not query the database. Locally (verified): `curl -s http://localhost:3000/health` returns `{"status":"ok"}`.

Log content (seen in a container): startup prints `BlogMe Lite listening on port <PORT>`; unexpected 500 errors print the stack. Failed logins and 4xx errors are not logged. Scripts also print a dotenv line such as `injected env (0) from .env`; it is harmless.

## Admin

Create (verified locally; interactive, password at least 12 characters, never stored in `.env`):

```sh
docker compose exec -it blog node src/scripts/createAdmin.js     # the non-interactive form was run in a container; it prints: Admin "admin" created.
```

The script also takes `node src/scripts/createAdmin.js <username> <email> <password>`, but that puts the password in shell history; prefer the prompt. A password under 12 characters exits with code 1 (`Password must be at least 12 characters`). If any admin exists it prints `An admin already exists; nothing to do.` and changes nothing (exit code 0). It cannot create a second admin and cannot reset a password.

### Reset the admin password

There is no reset script (password reset is out of scope). The manual procedure below was run locally: the old password returned 401 and the new one 200 afterwards. It updates the hash in place; the server can keep running.

Local (from `backend-lite/`, with `DB_PATH` set as for the server):

```sh
read -rs NEWPW; export NEWPW        # type the new password, 12+ characters
node -e "
const bcrypt=require('bcryptjs');const db=require('./src/db');
const pw=process.env.NEWPW; if(!pw||pw.length<12){console.error('need 12+ chars');process.exit(1)}
const r=db.prepare('UPDATE users SET password_hash=? WHERE username=?').run(bcrypt.hashSync(pw,12),'admin');
console.log('rows updated:',r.changes);db.close()"
unset NEWPW
```

`rows updated: 1` means success; `0` means the username is not `admin` (change it in the script). In the container (`docker compose exec` works for other scripts; this exact script was not run in a container):

```sh
read -rs NEWPW; export NEWPW
docker compose exec -e NEWPW blog node -e "<same script as above>"
unset NEWPW
```

Existing sessions are not ended by a password change: a token carries only the user id, so a stolen cookie stays valid up to 7 days. To end all sessions, also [rotate `JWT_SECRET`](#rotate-jwt_secret).

## Rotate `JWT_SECRET`

`JWT_SECRET` is required in every environment: the server refuses to start (`JWT_SECRET is not set`) if it is empty, and in production also if it is shorter than 32 characters (both verified). The scripts (`createAdmin.js`, `backup.js`) do not need it.

1. Generate: `openssl rand -hex 32`
2. Edit `.env` on the server (`JWT_SECRET=<new value>`).
3. `docker compose up -d --force-recreate` to recreate the container (a plain `restart` does not re-read `env_file`; recreate was run, the rotation itself was not).

Effect: every existing token fails verification, so all sessions end and the owner must log in again (the code verifies tokens with the current secret only; not run end to end).

## Backup and verify

```sh
docker compose exec -T blog node src/scripts/backup.js
```

Behavior (verified locally): uses better-sqlite3 `db.backup()`, which is safe on a live WAL database. It writes `blog-YYYYMMDD-HHMMSS.db` (UTC) into a `backups` folder next to the database file, i.e. `<DB dir>/backups`. In the container (`DB_PATH=/app/data/blog.db`) it wrote `/app/data/backups/blog-<stamp>.db`, inside the `blog-data` volume (seen). The image has no `sqlite3` CLI (checked); use the Node commands in this file. It prints `Backup written: <path>`, then deletes all but the newest 14 files matching `blog-*.db` (sorted by name). Exit code 1 and the error message if the backup fails. Two backups within the same second would collide on the name; cron does not do that.

Note: the backups live on the same volume and disk as the database. They protect against corruption and mistakes, not against losing the droplet. Copy them off the machine (see [deploy.md](deploy.md#nightly-backup-cron)).

Verify a backup: list the folder, then open the newest file read-only and run an integrity check (run locally; output was `ok`):

```sh
ls -l <DB dir>/backups
cd backend-lite
node -e "const D=require('better-sqlite3');const d=new D(process.argv[1],{readonly:true});console.log(d.prepare('select count(*) n from posts').get(), d.pragma('integrity_check'))" <path-to-backup>
```

Expected: a post count and `[ { integrity_check: 'ok' } ]`. A backup copied out with `docker compose cp blog:/app/data/backups/<file> ./scratch.db` and checked on the host with this command gave `{ n: 1 } [ { integrity_check: 'ok' } ]`. The 14-file pruning has not been run in a container. More: [deploy.md](deploy.md#test-restore).

## Restore (unverified)

1. `docker compose stop blog`
2. Copy the chosen backup over `blog.db` in the `blog-data` volume, and delete `blog.db-wal` and `blog.db-shm` next to it (stale WAL files must not be replayed onto the restored file).
3. `docker compose start blog`, then check `/health` and `GET /api/v1/posts`.

Exact container commands are not verified yet; rehearse once with the test restore in [deploy.md](deploy.md#test-restore).

## Disk and memory

```sh
df -h
docker system df
docker stats --no-stream
free -h
du -sh <DB dir> <DB dir>/backups
```

The compose file sets `mem_limit: 300m`. In a test container `docker stats --no-stream` showed about 20 MiB used of 300 MiB while idle.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Container or `npm start` exits with `JWT_SECRET is not set` | Empty or missing `JWT_SECRET` (needed in all environments) | Set it in `.env`, recreate. |
| Exits with `JWT_SECRET must be at least 32 characters in production` | Short secret with `NODE_ENV=production` | Use `openssl rand -hex 32`. |
| Cannot write DB / `SQLITE_CANTOPEN` | `/app/data` not owned by `node` user | Check volume ownership: `docker compose exec blog sh -c 'ls -ld /app/data'` should show `node node` (seen on a fresh volume). |
| `docker compose up` says the external network `caddy` is not found | Caddy's network has another name, or you are running locally | Set `CADDY_NETWORK=<name>` in `.env` (find it with `docker network ls`), or add `-f docker-compose.dev.yml` locally. Not run. |
| `docker compose build` fails in `npm ci --omit=dev` with `node-gyp` / `find Python` | `better-sqlite3` ships prebuilt binaries but npm still runs `node-gyp rebuild`; the slim image has no Python or compiler | The Dockerfile already uses `npm ci --omit=dev --ignore-scripts`. If you see this error, the flag was removed: put it back and rebuild. See [milestones.md](milestones.md#phase-4-containerize). |
| `/health` is fine but the site shows JSON `Not found` instead of the page | `public/index.html` missing in the image (frontend build not copied) | Rebuild the image; check `docker compose exec blog sh -c 'ls /app/public'`. |
| 502 from Caddy | Container down or not on Caddy network | `docker compose ps`; check network name and alias `blog`. |
| Login works but next request is 401 | Cookie not sent, or `Secure` cookie over plain HTTP in production | Use HTTPS; check `NODE_ENV`. |
| Everyone logged out | `JWT_SECRET` changed | Expected; log in again. |
| 401 `Not authenticated` after restoring an old backup | The admin row differs or was missing, so the token's user id no longer exists | Log in again; re-create the admin if there is none. |
| 429 `Too many attempts` on login | 10 failed logins from the same IP in 15 minutes | Wait for the window to end, or restart the container (counter is in memory). If it is you behind Caddy, check `trust proxy` sees real client IPs. |
| 415 `Content-Type must be application/json` | Client sent a non-JSON body | Send `Content-Type: application/json`. |
| 413 `request entity too large` | Body over 100 KB | Shorten the post. |
| 404 JSON on `/api/...` | Wrong path (`/category` is singular; creates are `/posts/create`) | Check [api/overview.md](api/overview.md). |
| Build killed (OOM) | 2 GB droplet | Add swap or build elsewhere. |
| `createAdmin.js` says "An admin already exists" | Admin was already created | Use the [reset procedure](#reset-the-admin-password). |
