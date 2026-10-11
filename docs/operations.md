# Operations

Run from the project directory on the droplet. First-time setup: [deploy.md](deploy.md).

Verification status (2026-10-05): the Node scripts and server behavior were run locally against a throwaway database (Phase 1). The container commands below were run on Docker Desktop (Compose v5.5.1) with a patched copy of the Dockerfile; the developer then re-ran the main checks on the committed `node:22-slim` Dockerfile (Docker 29.8.1, dev override: build, `/health`, `createAdmin`, login cookie, upload and fetch, backup, data surviving `down` then `up -d`; reported, not re-run by the docs pass). See [milestones.md](milestones.md#phase-4-containerize). Commands that were not run are marked "unverified". The droplet itself (Caddy, cron) is Phase 5 and not done.

Uploads (Phase 7, backend): verified locally with `curl`; in a container the developer saw a PNG upload, fetch and persistence across `down` then `up -d`. Linux and Caddy: unverified.

Compose reads `.env` in the project root (copy the root `.env.example`, not `backend/.env.example`). On the droplet the commands are plain `docker compose ...`. For a local test add `-f docker-compose.yml -f docker-compose.dev.yml` (see [development.md](development.md#docker-local)).

## Start, stop, restart, update

```sh
docker compose up -d --build     # start / rebuild
docker compose stop              # stop
docker compose restart blog      # restart
git pull && docker compose up -d --build   # update
docker compose ps
```

Run on a laptop: `up -d --build`, `ps` (Up, port bound), recreate (`up -d --force-recreate`) and data persistence were seen to work. `stop`, `restart`, `git pull` and the update flow were not run (unverified). `docker compose down` (without `-v`) keeps the `blog-data` volume; `down -v` deletes the whole volume: the database, the backups and every uploaded image. Never use `-v` on the server.

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

Scripts and the server open the same database from any directory: a relative `DB_PATH` (and the `.env` file) is resolved against `backend/`, not the current directory (seen: with `DB_PATH=./data2/blog.db`, running `createAdmin.js` from the repo root created `backend/data2/`, not `./data2/`). In the container `DB_PATH` is absolute, so this only matters for local runs. Earlier builds resolved it against the current directory, which produced the symptom "admin created but cannot log in" (see [troubleshooting](#troubleshooting)).

Create (verified locally; interactive, password at least 12 characters, never stored in `.env`):

```sh
docker compose exec -it blog node src/scripts/createAdmin.js     # the non-interactive form was run in a container; it prints: Admin "admin" created.
```

The script also takes `node src/scripts/createAdmin.js <username> <email> <password>`, but that puts the password in shell history; prefer the prompt. A password under 12 characters exits with code 1 (`Password must be at least 12 characters`). If any admin exists it prints `An admin already exists; nothing to do.` and changes nothing (exit code 0). It cannot create a second admin and cannot reset a password.

### Reset the admin password

There is no reset script (password reset is out of scope). The manual procedure below was run locally: the old password returned 401 and the new one 200 afterwards. It updates the hash in place; the server can keep running.

Local (from `backend/`, with `DB_PATH` set as for the server):

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

`backup.js` backs up the database only. It does not copy `uploads/`.

**The backup unit is the whole `blog-data` volume**: `blog.db`, `backups/` (database snapshots) and `uploads/` (images), all under `/app/data` in the container. Copy both `backups/` and `uploads/` off the droplet. Uploaded files are immutable (random names, never overwritten), so `rsync` only transfers new ones. The backups live on the same volume and disk as the database; they protect against corruption and mistakes, not against losing the droplet (see [deploy.md](deploy.md#nightly-backup-cron)).

Copy off the droplet (unverified; the `docker compose cp` form was not run for `uploads/`):

```sh
# one-off, from your laptop, via docker compose cp on the droplet
docker compose cp blog:/app/data/uploads ./uploads-copy
docker compose cp blog:/app/data/backups ./backups-copy
# repeated: rsync from a host path of the volume (find it with: docker volume inspect <project>_blog-data)
rsync -a --ignore-existing <droplet>:<volume mountpoint>/uploads/ ./uploads-copy/
```

Size check: `docker compose exec blog sh -c 'du -sh /app/data/uploads /app/data/backups'`.

Things to know about uploads:

- Orphans are never deleted: an image stays on disk after the post that used it is edited or deleted, or if an upload was abandoned. There is no cleanup script (a possible later addition).
- Images are public to anyone who has the URL (`/uploads/<uuid>.<ext>`), and the server keeps EXIF data such as GPS location. Strip it before uploading photos.

Verify a backup: list the folder, then open the newest file read-only and run an integrity check (run locally; output was `ok`):

```sh
ls -l <DB dir>/backups
cd backend
node -e "const D=require('better-sqlite3');const d=new D(process.argv[1],{readonly:true});console.log(d.prepare('select count(*) n from posts').get(), d.pragma('integrity_check'))" <path-to-backup>
```

Expected: a post count and `[ { integrity_check: 'ok' } ]`. A backup copied out with `docker compose cp blog:/app/data/backups/<file> ./scratch.db` and checked on the host with this command gave `{ n: 1 } [ { integrity_check: 'ok' } ]`. The 14-file pruning has not been run in a container. More: [deploy.md](deploy.md#test-restore).

## Restore (unverified)

1. `docker compose stop blog`
2. Copy the chosen backup over `blog.db` in the `blog-data` volume, and delete `blog.db-wal` and `blog.db-shm` next to it (stale WAL files must not be replayed onto the restored file).
3. Restore `uploads/` into the volume too (if the volume was lost). Files must be owned by the container user `node` (uid 1000), or new uploads and reads can fail with permission errors. Example with a throwaway container (unverified): `docker run --rm -v <project>_blog-data:/data -v "$PWD/uploads-copy":/src:ro node:22-slim sh -c 'mkdir -p /data/uploads && cp -a /src/. /data/uploads/ && chown -R node:node /data/uploads'`. Use `docker volume ls` for the real volume name.
4. `docker compose start blog`, then check `/health`, `GET /api/v1/posts`, and `curl -I https://blog.<domain>/uploads/<name>` for one known image (expect 200 and `nosniff`).

Exact container commands are not verified yet; rehearse once with the test restore in [deploy.md](deploy.md#test-restore).

## Disk and memory

```sh
df -h
docker system df
docker stats --no-stream
free -h
du -sh <DB dir> <DB dir>/backups <DB dir>/uploads   # in the container: /app/data, /app/data/backups, /app/data/uploads
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
| Upload returns 413 `Image too large (max 5 MB)` | File over 5 MB (or Caddy `request_body max_size 6MB`, if configured, rejecting it first; the Caddy line was not run) | Resize or compress the image. |
| Upload returns 415 | Not PNG, JPEG, GIF or WebP (SVG is always rejected), the `Content-Type` does not match the file's real bytes, or an empty body | Send the right `Content-Type` and a real image; with `curl` use `--data-binary @file`. See [api/overview.md](api/overview.md#post-uploads). |
| `/uploads/<name>` returns JSON 404 | File not in the uploads directory (typo, volume replaced, restored without `uploads/`) | `docker compose exec blog ls /app/data/uploads`; restore the files. |
| Admin created but cannot log in (401 `Invalid credentials`) | The script wrote to a different database than the server uses. Older builds resolved a relative `DB_PATH` against the current directory, so running from the repo root created `./data/blog.db` there | Fixed in the code: a relative `DB_PATH` and `.env` now resolve against `backend/`, so any directory gives the same DB. If you still have a stray `data/` folder in the repo root from before, delete it (after checking it holds nothing you need), then run `createAdmin.js` again. Check which file is in use with `ls backend/data`. |
| Images disappeared after a rebuild | `docker compose down -v` (or `docker volume rm`) deleted `blog-data`, which holds `uploads/` | Restore `uploads/` from the off-droplet copy. Never use `-v`. |
| 404 JSON on `/api/...` | Wrong path (`/category` is singular; creates are `/posts/create`) | Check [api/overview.md](api/overview.md). |
| Build killed (OOM) | 2 GB droplet | Add swap or build elsewhere. |
| `createAdmin.js` says "An admin already exists" | Admin was already created | Use the [reset procedure](#reset-the-admin-password). |
