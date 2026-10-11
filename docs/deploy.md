# Deploy

Status (2026-10-05): the container steps were run on a laptop (Docker Desktop) with a patched copy of the Dockerfile equivalent to the committed one (which now builds, per the lead; see [milestones.md](milestones.md#phase-4-containerize)). Nothing here was run on the droplet (Phase 5 not started): Caddy, the swap file, cron and the off-droplet copy are unverified. Day-to-day commands are in [operations.md](operations.md).

## Prerequisites (outside this repo)

- Droplet hardened (1 vCPU, 2 GB RAM), Docker installed.
- Caddy running in a shared Docker network.
- DNS A record for `blog.<domain>` pointing at the droplet.

## First-time setup

```sh
git clone <repo-url> blog-project
cd blog-project
cp .env.example .env                 # the ROOT example, read by docker-compose.yml
```

Edit `.env`:

```
JWT_SECRET=<output of: openssl rand -hex 32>
# CADDY_NETWORK=<name of Caddy's Docker network>   # only if it is not "caddy"
```

Do not copy `backend/.env.example`: its `NODE_ENV=development` and `DB_PATH=./data/blog.db` would override the image's `NODE_ENV=production` and `DB_PATH=/app/data/blog.db` (set in the Dockerfile) and would disable the 32 character secret check. `JWT_SECRET` must be at least 32 characters in production or the container exits. Keep `.env` out of git (it is in `.gitignore`; `.dockerignore` also keeps it out of the image).

Swap, if building on the droplet (unverified commands):

```sh
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
```

Start and create the admin:

```sh
docker compose up -d --build
docker compose exec -it blog node src/scripts/createAdmin.js
```

## Caddy snippet

Container joins Caddy's network (external, default name `caddy`, override with `CADDY_NETWORK`) with alias `blog`. Check the real name with `docker network ls` on the droplet. Add this (also in `Caddyfile.snippet`) to the Caddyfile, then reload Caddy:

```
blog.<domain> {
    encode gzip
    request_body {
        max_size 6MB
    }
    reverse_proxy blog:3000
}
```

`request_body { max_size 6MB }` (added in Phase 7, also in `Caddyfile.snippet`) lets a 5 MB image upload through with a little headroom and rejects larger bodies at Caddy before they reach the app. Unverified: Caddy was not run, so neither the directive syntax on your Caddy version nor an upload through Caddy was tested. The app enforces its own 5 MB limit regardless (413).

Verify (unverified): `curl -s https://blog.<domain>/health` returns `{"status":"ok"}`. The Express app has `trust proxy` set to 1, which is correct only with Caddy as the single proxy in front. The cookie is `Secure`, so use the site over HTTPS.

## Nightly backup cron

Planned (cron not installed or run). The command itself was run by hand in a container. Edit with `crontab -e`:

```
15 3 * * * cd /path/to/blog-project && docker compose exec -T blog node src/scripts/backup.js >> /var/log/blog-backup.log 2>&1
```

The cron line above backs up the database only. Add a second step that copies `uploads/` as well, for example (unverified, not run; adjust the destination):

```
30 3 * * * cd /path/to/blog-project && docker compose cp blog:/app/data/uploads /var/backups/blog-uploads-copy && docker compose cp blog:/app/data/backups /var/backups/blog-db-copy
```

Then pull `/var/backups/` off the droplet (for example `rsync -a --ignore-existing`, which suits immutable image files). `docker compose cp` of a directory into an existing directory can nest it (`.../uploads/uploads`); check the layout on first run, or rsync from the volume's host path instead (`docker volume inspect`). See [operations.md](operations.md#backup-and-verify) for the backup unit (the whole volume).

The script (verified locally) writes `blog-YYYYMMDD-HHMMSS.db` into `<DB dir>/backups` and keeps the newest 14; in the container that is `/app/data/backups` inside the volume (seen). That is the same volume as the live database, so also copy the files off the droplet; the off-droplet copy is not designed or run yet.

## Test restore

Do this at least once, on a scratch copy, not the live volume. Steps 1 and 2 were run on 2026-10-05 against a laptop container (`docker compose cp` out, then the integrity check: post count 1, `ok`). The throwaway server in step 3 and a restore into the live volume were not run.

1. Take a backup, then copy the newest file out of the container (for example `docker compose cp blog:/app/data/backups/<file> ./scratch.db`).
2. Check it: `node -e "const D=require('better-sqlite3');const d=new D('scratch.db',{readonly:true});console.log(d.prepare('select count(*) n from posts').get(), d.pragma('integrity_check'))"` from `backend/`; expect your post count and `integrity_check: ok`.
3. Optionally start a throwaway server: `DB_PATH=./scratch.db JWT_SECRET=change-me PORT=3999 node src/index.js`, then `curl http://localhost:3999/api/v1/posts` and confirm posts and categories are present.

4. Uploads (unverified): copy `uploads/` out the same way (`docker compose cp blog:/app/data/uploads ./uploads-scratch`), pick a filename from it, and confirm it is a valid image (`file <name>`, or open it). For a full rehearsal, restore `uploads/` into a scratch volume with `node:node` ownership (see the restore steps in operations) and `curl -I http://localhost:3999/uploads/<name>` against the throwaway server with `UPLOAD_DIR` pointing at it (expect 200, `nosniff`).

Live restore steps: [operations.md](operations.md#restore-unverified).

## Done when (PLAN.md Phase 5)

`https://blog.<domain>` loads over HTTPS, login works, a post can be published, a backup file exists and restores (with its uploaded images).

## TODO: verify once code lands

- [x] Compose file `docker-compose.yml`, service `blog`, alias `blog` (seen in the file).
- [x] Env file is the root `.env` with `JWT_SECRET` (seen; ran with it).
- [x] Backup directory in the container is `/app/data/backups` (seen).
- [x] Container user `node` can write `/app/data` (seen).
- [ ] Name of Caddy's network on the droplet.
- [x] Committed Dockerfile builds (lead-confirmed; I did not re-run it). Re-run the container checks with it.
- [ ] If `docker compose build` fails in `npm ci` with `node-gyp` / `find Python`: the Dockerfile already uses `--ignore-scripts`; if that flag was removed, restore it (`RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force`). See [operations.md](operations.md#troubleshooting).
- [ ] Swap, Caddy reload, cron, HTTPS login, restore on the droplet.
- [ ] Caddy `request_body { max_size 6MB }` accepted by the installed Caddy version; a 5 MB upload through Caddy works.
- [ ] Uploads copied by cron and restored with `node:node` ownership.
