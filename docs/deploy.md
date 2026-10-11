# Deploy

Status (2026-10-05): the container steps were run on a laptop (Docker Desktop) with a patched copy of the Dockerfile equivalent to the committed one (which now builds, per the lead; see [milestones.md](milestones.md#phase-4-containerize)). Nothing here was run on the droplet (Phase 5 not started): Caddy, the swap file, cron and the off-droplet copy are unverified. Day-to-day commands are in [operations.md](operations.md).

## Prerequisites (outside this repo)

- Droplet hardened (1 vCPU, 2 GB RAM), Docker installed.
- Caddy running in Docker (or reachable as a container you can attach to the `blog-net` network, see [Caddy snippet](#caddy-snippet)).
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
# BLOG_NETWORK=blog-net     # optional: name of the private network shared with Caddy
# TRUST_PROXY=1             # optional: proxy hops in front of the app (default 1 = Caddy)
```

Do not copy `backend/.env.example`: its `DB_PATH=./data/blog.db` would override the image's `/app/data/blog.db` (set in the Dockerfile) and its `NODE_ENV=development` is not what you want on a server. `docker-compose.yml` forces `environment: NODE_ENV: production` for the `blog` service, which wins over `env_file`, so a `NODE_ENV` line in `.env` cannot weaken the cookie or secret checks (read from the compose file; `docker compose exec blog printenv NODE_ENV` was not run by the docs pass, unverified). `DB_PATH` is not forced, so keep it out of `.env`. The container exits if `JWT_SECRET` is shorter than 32 characters, has fewer than 8 distinct characters, or looks like a placeholder (starts with `change-me`, `secret`, `password`, `jwt-secret`, `your-`). If you set `UPLOAD_DIR`, it must not contain the database directory or be, or lie inside, `<DB dir>/backups` (the server refuses to start); leaving it unset is the safe default. Any `NODE_ENV` other than `development` or `test` (including unset) is treated as production. `TRUST_PROXY` must match the real number of proxies in front of the app (Caddy only: `1`); a larger number lets clients spoof `X-Forwarded-For` and dodge the login limit. Keep `.env` out of git (it is in `.gitignore`; `.dockerignore` also keeps it out of the image).

Swap, if building on the droplet (unverified commands):

```sh
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
```

Start and create the admin:

```sh
docker compose up -d --build
docker compose exec -it blog node src/scripts/createAdmin.js          # hidden password prompt
# or non-interactive (password from the environment, never as an argument):
docker compose exec -T -e ADMIN_PASSWORD='<password, 12+ chars>' blog node src/scripts/createAdmin.js <username> <email>
```

The `-e ADMIN_PASSWORD=...` form of `docker compose exec` was not run; the script reading `ADMIN_PASSWORD` is in the code. Prefer the prompt (the value above lands in shell history).

Then connect Caddy to the private network (next section) before expecting the site to answer.

## Caddy snippet

`docker compose up` creates a private, internal network `blog-net` (override the name with `BLOG_NETWORK`) and attaches the container to it with alias `blog`. Only Caddy should join it. Attach Caddy once, using its container name from `docker ps`:

```sh
docker network connect blog-net <caddy-container>
```

That attachment is lost if Caddy's container is recreated. To make it permanent, declare the network as external in Caddy's own compose file (unverified, shown as a sketch):

```yaml
services:
  caddy:
    networks: [default, blog-net]
networks:
  blog-net:
    external: true
```

Caddy still reaches the app as `blog:3000`. Because `blog-net` is `internal`, the blog container has no outbound internet access (nothing in the app needs it). Other containers on Caddy's networks cannot reach the blog. Add this (also in `Caddyfile.snippet`) to the Caddyfile, then reload Caddy:

```
blog.<domain> {
    encode gzip
    header Strict-Transport-Security "max-age=31536000; includeSubDomains"
    request_body {
        max_size 6MB
    }
    reverse_proxy blog:3000
}
```

`Strict-Transport-Security` is set here rather than in Express because Caddy terminates TLS; it is unverified against a real Caddy. The snippet sends `max-age=31536000; includeSubDomains`: browsers will then force HTTPS on every subdomain of the domain for a year, so remove `includeSubDomains` if any subdomain is HTTP-only. There is no `preload`. The app itself sets CSP, `X-Content-Type-Options`, `Referrer-Policy` and `X-Frame-Options` (see [security.md](security.md)). `request_body { max_size 6MB }` (added in Phase 7, also in `Caddyfile.snippet`) lets a 5 MB image upload through with a little headroom and rejects larger bodies at Caddy before they reach the app. Unverified: Caddy was not run, so neither the directive syntax on your Caddy version nor an upload through Caddy was tested. The app enforces its own 5 MB limit regardless (413).

Verify (unverified): `curl -s https://blog.<domain>/health` returns `{"status":"ok"}`. The Express app trusts one proxy hop by default (`TRUST_PROXY=1`), which is correct only with Caddy as the single proxy in front. The cookie is `Secure`, so use the site over HTTPS.

## Never use the dev override on the server

Use only `docker compose ...` with `docker-compose.yml` on the droplet. `docker-compose.dev.yml` is for a local machine: it sets `NODE_ENV=development` (non-Secure cookie, `JWT_SECRET` checks skipped, CORS enabled), publishes `127.0.0.1:3000`, leaves `TRUST_PROXY` at `1` with no proxy (spoofable `X-Forwarded-For`), and does not rename the project or the volume, so run from the same directory it would mount the production `blog-data` volume. Details and the planned fix: [security.md N2](security.md#n2-docker-composedevyml-is-unsafe-outside-a-local-machine) (open). After first start, confirm `docker compose exec blog printenv NODE_ENV` prints `production` (unverified).

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

The script writes `blog-YYYYMMDD-HHMMSS.db.tmp` into `<DB dir>/backups` and renames it to `blog-YYYYMMDD-HHMMSS.db` on success (a failed run removes the temp file and exits 1), then keeps the newest 14 non-empty `blog-*.db` files; `.tmp` and zero-size files are ignored by retention (read from the code; the earlier version was run locally, the new one was not run by the docs pass for the failure path). Files are created with mode 0600 in a directory created with 0700 (in code; not checked on Linux, and Windows ignores modes); in the container that is `/app/data/backups` inside the volume (seen). That is the same volume as the live database, so also copy the files off the droplet; the off-droplet copy is not designed or run yet.

## Test restore

Do this at least once, on a scratch copy, not the live volume. Steps 1 and 2 were run on 2026-10-05 against a laptop container (`docker compose cp` out, then the integrity check: post count 1, `ok`). The throwaway server in step 3 and a restore into the live volume were not run.

1. Take a backup, then copy the newest file out of the container (for example `docker compose cp blog:/app/data/backups/<file> ./scratch.db`).
2. Check it: `node -e "const D=require('better-sqlite3');const d=new D('scratch.db',{readonly:true});console.log(d.prepare('select count(*) n from posts').get(), d.pragma('integrity_check'))"` from `backend/`; expect your post count and `integrity_check: ok`.
3. Optionally start a throwaway server: `NODE_ENV=development DB_PATH=./scratch.db JWT_SECRET=change-me PORT=3999 node src/index.js` (`NODE_ENV=development` is required: otherwise the placeholder-secret check refuses to start), then `curl http://localhost:3999/api/v1/posts` and confirm posts and categories are present.

4. Uploads (unverified): copy `uploads/` out the same way (`docker compose cp blog:/app/data/uploads ./uploads-scratch`), pick a filename from it, and confirm it is a valid image (`file <name>`, or open it). For a full rehearsal, restore `uploads/` into a scratch volume with `node:node` ownership (see the restore steps in operations) and `curl -I http://localhost:3999/uploads/<name>` against the throwaway server with `UPLOAD_DIR` pointing at it (expect 200, `nosniff`).

Live restore steps: [operations.md](operations.md#restore-unverified).

## Done when (PLAN.md Phase 5)

`https://blog.<domain>` loads over HTTPS, login works, a post can be published, a backup file exists and restores (with its uploaded images).

## TODO: verify once code lands

- [x] Compose file `docker-compose.yml`, service `blog`, alias `blog` (seen in the file).
- [x] Env file is the root `.env` with `JWT_SECRET` (seen; ran with it).
- [x] Backup directory in the container is `/app/data/backups` (seen).
- [x] Container user `node` can write `/app/data` (seen).
- [ ] `docker network connect blog-net <caddy-container>` (or external network in Caddy's compose) done on the droplet, and `blog:3000` reachable from Caddy.
- [ ] HSTS header (`max-age=31536000; includeSubDomains`) seen on a response through real Caddy, and no HTTP-only subdomain exists (otherwise drop `includeSubDomains`).
- [ ] `docker compose exec blog printenv NODE_ENV` prints `production`.
- [x] Committed Dockerfile builds (lead-confirmed; I did not re-run it). Re-run the container checks with it.
- [ ] If `docker compose build` fails in `npm ci` with `node-gyp` / `find Python`: the Dockerfile already uses `--ignore-scripts`; if that flag was removed, restore it (`RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force`). See [operations.md](operations.md#troubleshooting).
- [ ] Swap, Caddy reload, cron, HTTPS login, restore on the droplet.
- [ ] Caddy `request_body { max_size 6MB }` accepted by the installed Caddy version; a 5 MB upload through Caddy works.
- [ ] Uploads copied by cron and restored with `node:node` ownership.
