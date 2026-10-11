# Security

How BlogMe Lite is security-tested, how to repeat the review, and the findings of the first audit.

Status (2026-10-11): the first audit's fixes, fix pass 1 and fix pass 2 are applied but uncommitted. This page was written from the developer's finding lists and from `git diff` and the code; `npm test` in `backend/` was run by the docs pass (17 of 17 pass). Browser, Linux file-mode, running-container and real-Caddy checks are unverified and listed in [Open checks](#open-checks). **Mermaid audit (2026-10-11): no Critical or High; MD-M1 (Medium), MD-L1 and MD-L2 (Low) fixed in the working tree, see [Mermaid audit](#mermaid-audit-2026-10-11).** **Final re-audit (2026-10-11, after fix pass 2): no Critical, High or Medium findings. M-A, L-A to L-E, I-E and I-G are Closed; no regression in M1, L1 to L8, L10, I2, I3. New and open: N1 and N2 (Low), I-H to I-N (Informational). Still open from before: I-A to I-D; I-F, L9, I1, I4, I5 accepted. See [Final re-audit](#final-re-audit-2026-10-11).**

Related: [architecture.md](architecture.md#auth-flow) (auth design), [operations.md](operations.md) (secret rotation, lockout), [deploy.md](deploy.md) (Caddy, network), [testing.md](testing.md#7-security-spot-checks) (manual spot checks).

## Run the audit

Two parts: a read-only review, then the automated tests. Do not change code during the review; write findings first, fix afterwards.

1. Read-only review of: `backend/src/` (app, routes, middleware, scripts, db), `frontend/src/` (services, Markdown rendering, auth state), `Dockerfile`, `docker-compose.yml`, `docker-compose.dev.yml`, `Caddyfile.snippet`, `.env.example` files. Use `git diff` / `git log -p` to see what changed since the last audit.
2. Automated tests:

```sh
cd backend
npm install
npm test        # node --test "test/*.test.js"
```

Expected end of output (seen on 2026-10-11):

```
ℹ tests 17
ℹ pass 17
ℹ fail 0
```

3. Optional manual spot checks against a running container or server: [testing.md section 7](testing.md#7-security-spot-checks) (secrets in responses, cookie flags, uploads, headers).

The tests cover: admin-only writes (403/401), logout revocation, `tv` claim required, security headers, cookie `Secure` rule, `JWT_SECRET` startup checks, the `token_version` migration, the `UPLOAD_DIR` guard, the per-IP / IPv6 /64 / global login limits (including the known-good exemption), the `Secure` cookie in production, the `JWT_SECRET` distinct-character rule, the `UPLOAD_DIR` backups guard, and `TRUST_PROXY` parsing (`backend/test/*.test.js`). They do not cover uploads content checks, SQL injection strings, XSS rendering, backup or `createAdmin` behavior; those rely on the review and on the manual steps.

## What each pass checks

| Pass | Questions | Where to look |
|---|---|---|
| Auth and session | Is the JWT algorithm pinned (HS256)? Is the secret strong and required? Cookie flags (HttpOnly, SameSite, Secure)? Can a token be revoked (logout, `token_version`)? Is login rate-limited, and can the limit be bypassed (`X-Forwarded-For`, IPv6, `TRUST_PROXY`)? Generic login errors? | `middleware/auth.js`, `routes/user.js`, `app.js`, `env.js` |
| Authorization | Does every write route require `requireAuth` and `requireAdmin`? Do public routes expose only intended fields (no `password_hash`)? | `routes/*.js`, `serialize.js` |
| SQL injection | Is every query a prepared statement with bound parameters? Any string-built SQL? Ids parsed through `parseId`? | `routes/*.js`, `db.js`, `scripts/` |
| Uploads | Size limit, magic-byte check matching the declared type, SVG rejected, random server-made names, no path traversal, `nosniff` + sandbox CSP on `/uploads`, upload directory cannot overlap the database. Known gap: image metadata (EXIF) is kept. | `routes/uploads.js`, `uploadDir.js`, `app.js` |
| XSS and Markdown | Is raw HTML escaped (no `rehype-raw`)? One renderer for preview and published page? Tokens or user data in `localStorage`? Mermaid: is `securityLevel` still `strict`, the version pinned, and are diagram directives/frontmatter still refused (`hasMermaidConfig`)? | `frontend/src/components/posts/PostContent.jsx`, `frontend/src/utils/axiosInstance.js` |
| CSRF and CORS | Cookie `SameSite=Lax`, writes need `application/json` (415 otherwise), CORS only in development/test, no wildcard origin with credentials. Known gap: no Origin/Referer check (accepted, I1). | `app.js`, `middleware/http.js` |
| Headers | CSP, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, no `X-Powered-By`; HSTS in Caddy. Check the CSP against the real frontend in a browser. | `app.js`, `Caddyfile.snippet` |
| Container and deploy | Non-root user, no published ports, private network, `cap_drop`, `no-new-privileges`, memory limit, `HEALTHCHECK`, secrets only in `.env` (git-ignored, `.dockerignore`d), install flags, image base. | `Dockerfile`, `docker-compose*.yml`, `.dockerignore`, `.gitignore` |
| Backup and admin scripts | Backup file and directory permissions; password never taken from argv; no seed script on production; `createAdmin` refuses a second admin. | `scripts/backup.js`, `scripts/createAdmin.js`, `scripts/seed.js` |

## Severity scale

| Level | Meaning |
|---|---|
| Critical | Remote compromise or data loss with no preconditions (auth bypass, RCE, public database file). Fix before deploying. |
| High | Serious weakness exploitable with modest effort (stored XSS, privilege escalation, secret exposure). Fix before deploying. |
| Medium | Real weakness that needs a precondition or limits damage (control bypass that helps brute force). Fix soon. |
| Low | Hardening gap or defense in depth; hard to exploit alone. Fix or accept with a reason. |
| Informational | Observation, recommendation or accepted trade-off; no direct exploit. |

## Report format

One entry per finding, in this shape:

```
ID: M1
Severity: Medium
Location: backend/src/app.js:<line>   (file:line; the line of the code as reviewed)
Description: what is wrong, in one or two sentences.
Exploit scenario: who does what, step by step, and what they gain.
Fix: the smallest change that closes it, and how to verify it.
```

Always give `file:line`. If the code has changed since, say which commit or diff the line refers to.

## Findings from the first audit (2026-10-11)

Source: the developer's finding list. The `file:line` and exploit text of the original report were not available to the docs pass, so the descriptions below are derived from the list and from what the diff changed; line numbers are not given. "Fixed" entries are read from the uncommitted diff and covered by tests where noted; none has been re-audited yet.

| ID | Severity | Finding | Status |
|---|---|---|---|
| M1 | Medium | Login throttle could be bypassed by spoofing `X-Forwarded-For` (every request looked like a new client). | Fixed. `trust proxy` is now configurable with `TRUST_PROXY` (default `1`, number of hops or an IP/subnet string; `0` when no proxy), so only the hops you trust are believed. Test: `per-IP limit honours X-Forwarded-For`, `TRUST_PROXY=0 ...`, `TRUST_PROXY accepts a subnet string`. |
| L1 | Low | Missing security headers. | Fixed. `app.js` sets CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` on everything except `/uploads` (which keeps its own CSP); `X-Powered-By` disabled; HSTS added in `Caddyfile.snippet`. Test: `security headers on app responses`. Unverified: CSP in a browser; HSTS through real Caddy. |
| L2 | Low | Throttle keyed on the full IPv6 address (a client with a /64 has 2^64 addresses) and no global limit. | Fixed. IPv6 keyed on its /64; IPv4-mapped IPv6 treated as IPv4; added a global cap of 100 failed logins per 15 minutes across all clients. Side effect: 100 failures lock out unknown clients until the window ends or the process restarts; since fix pass 2 (M-A), clients with a recent successful login are exempt from the global cap. Tests: `IPv6 clients share a bucket per /64`, `global failed-login counter blocks everyone after 100 failures`. |
| L3 | Low | Logout only cleared the cookie; a copied token stayed valid for 7 days. | Fixed. `users.token_version` (migrated into existing databases); the JWT carries `tv`; logout bumps the version, which revokes every token for the user. Tokens without `tv` are rejected, so sessions from before the change need a new login. A password reset does not bump the version (documented in [operations.md](operations.md#reset-the-admin-password)). Tests: `logout revokes previously issued tokens`, `token without tv claim is rejected`, `migration adds token_version ...`. |
| L4 | Low | Write routes checked login but not role. | Fixed. `requireAdmin` added after `requireAuth` on all create/update/delete routes and on upload; non-admin gets 403 `Forbidden`. Test: `requireAdmin ...`. |
| L5 | Low | Anything other than `NODE_ENV=production` (including unset) relaxed cookie `Secure` and the secret check. | Fixed. `src/env.js` `isDevLike()` is true only for `development` and `test`; all other values (including unset) get `Secure` cookies, no CORS and the secret checks. Test: `JWT_SECRET checks apply unless NODE_ENV is development or test`, `cookie is not Secure in test env`. |
| L6 | Low | A weak or placeholder `JWT_SECRET` was accepted outside the exact `production` value. | Fixed. Outside development/test the secret must be 32+ characters and must not start with `change-me`, `secret`, `password`, `jwt-secret` or `your-`; the server refuses to start. Generate with `openssl rand -hex 32`. |
| L7 | Low | Backups were written with default permissions. | Fixed in code. `backup.js` creates the `backups` directory with mode 0700 and each backup with 0600 (the `.tmp` file is created with `0o600`, `chmod`ed, then renamed). Unverified on Linux: the developer works on Windows, which ignores modes; check with `ls -l` on the droplet. |
| L8 | Low | `createAdmin.js` accepted the password as a command-line argument (shell history, process list). | Fixed. The password comes from `ADMIN_PASSWORD` or a hidden prompt; a third argument is ignored. Setting `ADMIN_PASSWORD` inline still lands in shell history; the prompt avoids that. |
| L9 | Low | Uploaded images keep metadata such as EXIF GPS data. | Accepted risk. Stripping would need an image library (a new dependency and attack surface) for a single-author blog; the owner strips photos before upload (documented in [writing-posts.md](writing-posts.md) and [operations.md](operations.md)). |
| L10 | Low | `POST /user/logout` did not require `application/json`, unlike every other write. | Fixed. `requireJson` added; the frontend now posts `{}`. Test: `logout requires application/json`. Clients must send `-H 'Content-Type: application/json' -d '{}'`. |
| I1 | Informational | No Origin/Referer check for CSRF. | Accepted risk. The cookie is `SameSite=Lax` and all writes require `Content-Type: application/json`, which a cross-site form cannot send and which would trigger a CORS preflight that production (no CORS) denies. An explicit Origin check was not added. |
| I2 | Informational | `UPLOAD_DIR` could point at the database directory, publishing `blog.db` under `/uploads`. | Fixed. `uploadDir.js` refuses to start if `UPLOAD_DIR` contains the DB file or its directory (symlinks resolved). Test: `uploadDir refuses a dir that contains the DB file or its directory`. |
| I3 | Informational | Container hardening. | Fixed. `docker-compose.yml`: `cap_drop: [ALL]`, `no-new-privileges:true`, a private `internal: true` network `blog-net` replacing the shared external Caddy network (other containers cannot reach the blog; the blog has no outbound internet). Dockerfile: `HEALTHCHECK` on `/health`. Already in place: non-root `node` user, no published ports, `mem_limit: 300m`. `docker compose config` and the image build/healthy state were reported by the developer, not re-run by the docs pass. |
| I4 | Informational | Dependency install runs with `--ignore-scripts`. | No change needed. The flag limits what dependency install scripts can do and is already in the Dockerfile (needed anyway because the slim image has no compiler). The image build with it was reported OK by the developer; not re-run by the docs pass (unverified). |
| I5 | Informational | Use a separate production `JWT_SECRET`. | Guidance, not code. Generate a fresh value on the droplet (`openssl rand -hex 32`); never reuse a development value or one that has been pasted anywhere. Rotation: [operations.md](operations.md#rotate-jwt_secret). |

## Mermaid diagrams (frontend)

Added 2026-10-11 (uncommitted when documented; read from `MermaidDiagram.jsx`, `mermaidUtils.js`, `PostContent.jsx`, `package.json`). The audit of this feature and its fixes are in [Mermaid audit](#mermaid-audit-2026-10-11) below.

- Fenced `mermaid` blocks are rendered by the `mermaid` library, initialized with `securityLevel: 'strict'`. The resulting SVG is put in the page with `innerHTML`; this relies on Mermaid's strict mode sanitizing the SVG (the code comment says DOMPurify). That reliance is the point to keep in mind: a regression or bypass in Mermaid's sanitizer would be an XSS path. The diagram source is admin-authored Markdown.
- Raw HTML in Markdown is still not rendered (no `rehype-raw`). Only the `pre` renderer changed, and only for `language-mermaid`.
- Diagram source is not trusted to carry config: `hasMermaidConfig` (`mermaidUtils.js:15-18`) refuses `%%{` directives and leading `---` frontmatter before Mermaid is imported; `mermaid.initialize` (`MermaidDiagram.jsx:50-57`) also sets `themeCSS: ""`, `htmlLabels: false` and `flowchart.htmlLabels: false`.
- The CSP was not changed. It has no `unsafe-eval`; the developer reports no direct `eval` or `new Function` in Mermaid's browser path (a lodash `Function('return this')` fallback is described as unreachable in browsers; not checked by the docs pass). Styles in the SVG rely on the existing `style-src 'unsafe-inline'`.
- New dependency, pinned exactly (`"mermaid": "11.17.2"`, no caret), with a large transitive tree in `frontend/package-lock.json`. Bump it deliberately: read the changelog, run `npm run build` and `npm test`, render a flowchart and an invalid block in a browser, and check the console for CSP violations. Run `npm audit` in `frontend/` after changes (not run by the docs pass).
- Mermaid is fetched only on pages that render a diagram; the runtime image still serves static files.

## Mermaid audit (2026-10-11)

Source: the auditor's read of the mermaid 11.17.2 source (no browser). Outcome: no Critical, no High. IDs are prefixed `MD-` because M1 and L1 are already used by the first audit above. Line numbers refer to the working tree after the fix (the pre-fix lines were not available to the docs pass). "Fixed" is read from the code and the tests; the fix has not been re-audited.

| ID | Severity | Finding | Status |
|---|---|---|---|
| MD-M1 | Medium | A post's Mermaid source could carry a `%%{init: {"themeCSS": ...}}%%` directive or leading `---` frontmatter with `config:`. `themeCSS` is not a "secure" key and is added unscoped to the SVG's style; the SVG is inserted with `innerHTML` (`MermaidDiagram.jsx:61`), so it could apply page-wide CSS: a fake overlay, hidden UI, or tracking through `url(https:...)` because the CSP allows `img-src https:`. Only the admin writes posts, so exploiting it needs a compromised admin account or a future multi-author setup. | Fixed |
| MD-L1 | Low | When a render failed after the component unmounted or went stale, Mermaid's temporary elements `d<id>` and `i<id>` stayed in `<body>`. | Fixed |
| MD-L2 | Low | Defence in depth: `htmlLabels` was not turned off, so labels could carry HTML (`foreignObject`) content. | Fixed |

What changed:

- MD-M1: `hasMermaidConfig(code)` (`frontend/src/components/posts/mermaidUtils.js:15-18`) is true for `%%` followed by optional whitespace and `{` anywhere in the source, or for a leading `---` frontmatter fence; it is false for `A --- B` and for plain `%%` comments. In that case `MermaidDiagram.jsx` (`:38`, `:41`, `:79`) does not import or call Mermaid and shows the source in `<pre><code>` with the caption `Diagram directives and frontmatter are not allowed.` `initialize` also sets `themeCSS: ""` (`:54`). Tests: `hasMermaidConfig rejects directives and frontmatter` and `hasMermaidConfig allows normal diagrams` (`mermaidUtils.test.js`).
- MD-L1: `removeTempElements(id)` (`MermaidDiagram.jsx:26-29`) runs in `catch` before the stale check (`:65`), in `finally` (`:69`) and in the effect cleanup (`:75`).
- MD-L2: `htmlLabels: false` and `flowchart: { htmlLabels: false }` in `initialize` (`:55-56`).

Informational (no change made):

- Heavy or huge diagrams can slow or freeze the reader's own browser (reader-side denial of service). Admin-authored content only.
- Remote images in diagram labels have the same exposure as Markdown images (see I-F: `img-src` allows any `https:`).
- Mermaid 12.x exists; 11.17.2 stays pinned. Upgrade deliberately (procedure above).

Verification: the docs pass ran frontend `npm test` (5 of 5 pass). Developer-reported: `npm run build` ok; backend `npm test` 17 pass; headless Chrome against the real backend CSP, dark theme: flowchart, sequence, ER and state diagrams render; directive and frontmatter blocks fall back with the caption and no page CSS; an invalid diagram falls back; no stray body elements; no CSP violations. Unverified: editor preview, light theme, other diagram types (gantt, class and so on), Docker build. ESLint on the posts folder reported 21 errors (developer-reported), mostly existing prop-types/unused React; whether the new code adds any was not checked.

## Open checks

Not seen by the docs pass; each can invalidate a "Fixed" above:

- CSP in a browser: confirm the login page, a post with images, and the editor load with no console violations ([testing.md 7.8](testing.md#7-security-spot-checks)).
- Mermaid: strict-mode sanitization with a hostile diagram source (for example `click` callbacks or script in labels) in a browser; the editor preview; light theme; diagram types other than flowchart, sequence, ER and state (gantt, class and so on); the Docker build with the new dependency; lint errors from the new code. Flowchart, sequence, ER and state diagrams, the directive/frontmatter fallback and an invalid block were rendered in headless Chrome (dark theme, real CSP, no violations; developer-reported).
- Mode 0600/0700 of backups on a Linux host, and the failed-backup cleanup path.
- `NODE_ENV` inside the running container (`docker compose exec blog printenv NODE_ENV`).
- HSTS (now with `includeSubDomains`) and the `blog-net` attachment with a real Caddy; Caddy reaching `blog:3000`.
- The `curl` examples in [api/overview.md](api/overview.md) were not all re-run after the changes.

## Re-audit after fixes

1. List what changed: `git diff <audited commit>..HEAD` (or `git diff` while uncommitted). Findings are tied to a commit or diff, so record which one was audited.
2. For each finding marked Fixed, read the fix and write a test or a `curl`/`docker` command that would fail on the old code and pass on the new. Prefer a test in `backend/test/` when it is about app behavior.
3. Run `cd backend && npm test`; all tests must pass.
4. Re-run the passes above on every file the fixes touched, looking for new issues the fix introduced (for example the global lockout in L2 created a lockout risk).
5. Run the manual spot checks that tests cannot cover: [testing.md section 7](testing.md#7-security-spot-checks), the Open checks list above.
6. Update this page: change each finding's status to "verified fixed" (with date and how) or reopen it; add new findings with the next ID; keep accepted risks with their reason.
7. Record the result below.

### Re-audit result

Date: 2026-10-11. Audited: the uncommitted working tree on branch `feat/deployment-plan` (no commit to cite; line numbers below refer to that tree). Method: code reading plus `npm test` in `backend/` (15 of 15 pass at the time; after fix pass 2 the suite has 17 tests, all passing, seen by the docs pass). Not exercised: Docker, Caddy, a browser, Linux file modes. Items below that depend on them are unverified.

Outcome: no Critical and no High findings.

**Prior findings.** All 11 in-scope findings (M1, L1 to L8, L10, I2, I3) are Closed. Five were closed with a small residual, now tracked as new findings (the mapping is the docs pass's reading of the new IDs; confirm with the auditor):

| Prior | Residual | New finding |
|---|---|---|
| L1 | CSP and HSTS are minimal | L-B, L-C |
| L5 | `NODE_ENV` from `.env` overrides the image default | L-D |
| L6 | Placeholder check is a short prefix list | I-G |
| L7 | A failed backup leaves a 0-byte file (modes themselves still unverified on Linux) | L-A |
| I2 | `UPLOAD_DIR` guard misses the backups directory | L-E |

L9, I1, I4 and I5 stay accepted (reasons in the first-audit table above).

**New findings of the first re-audit.** Nothing here is a regression of a Closed item; they were found in or beside the fixes. Fix pass 2 (below) fixed most of them and the final re-audit closed them. Current status of everything is in the [final re-audit](#final-re-audit-2026-10-11).

| ID | Severity | Status |
|---|---|---|
| M-A | Medium (design trade-off) | Closed (final re-audit); fixed in code (fix pass 2), residual restart caveat |
| L-A | Low | Closed (final re-audit); fixed in code (fix pass 2); cleanup path and 0600 on Linux unverified |
| L-B | Low | Closed (final re-audit); fixed in code (fix pass 2); browser check unverified |
| L-C | Low | Closed (final re-audit); fixed in `Caddyfile.snippet` (fix pass 2); real Caddy unverified |
| L-D | Low | Closed (final re-audit); fixed in compose (fix pass 2); running container unverified |
| L-E | Low | Closed (final re-audit); fixed in code with a test (fix pass 2) |
| I-A | Informational | Open |
| I-B | Informational | Open |
| I-C | Informational | Open |
| I-D | Informational | Open |
| I-E | Informational | Closed (final re-audit); tests added in fix pass 2 |
| I-F | Informational | Accepted |
| I-G | Informational | Closed (final re-audit); distinct-character rule |

#### Fix pass 2 (2026-10-11)

The developer fixed the open re-audit findings in the uncommitted working tree. The docs pass read each change in the code or `git diff` and ran `npm test` (17 of 17 pass). Re-audited afterwards: see [Final re-audit](#final-re-audit-2026-10-11).

| ID | What changed | Where |
|---|---|---|
| M-A | The global cap stays (100 failures per 15 minutes) but a client with a successful login in the last 24 hours is exempt from it. The per-client cap of 10 still applies to them. In memory: a restart empties the exemption list, so if the container restarts during an attack the admin is locked out until the window ends (up to 15 minutes). | `backend/src/routes/user.js` (`knownGood`, `isLimited`) |
| L-A | Backup writes `blog-<stamp>.db.tmp` (created 0600), `chmod` 0600, then renames to `blog-<stamp>.db` on success; on failure the temp file is removed and the exit code is 1. Retention considers only `blog-*.db` files larger than zero bytes, so `.tmp` and zero-size files are ignored. | `backend/src/scripts/backup.js` |
| L-B | CSP now ends `...frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`. Full string in [architecture.md](architecture.md#key-design-decisions). | `backend/src/app.js` |
| L-C | HSTS is `max-age=31536000; includeSubDomains`. Remove `includeSubDomains` if any subdomain of the domain is HTTP-only. No `preload`. | `Caddyfile.snippet` |
| L-D | `docker-compose.yml` sets `environment: NODE_ENV: production` for `blog`, which wins over `env_file`, so `.env` cannot downgrade it. `docker-compose.dev.yml` sets `NODE_ENV: development`, so the dev container uses a non-Secure cookie, CORS and relaxed secret checks (local testing only, never on the server). | `docker-compose.yml`, `docker-compose.dev.yml` |
| L-E | `uploadDir.js` also refuses an `UPLOAD_DIR` that equals or lies inside `<dbdir>/backups`. Test: `uploadDir refuses the backups directory and anything inside it`. | `backend/src/uploadDir.js` |
| I-E | Added `cookie is Secure when NODE_ENV is production` and an independent global-limit test (`global failed-login cap blocks unknown clients but not recent known-good ones`). Still no test for the CSP against the built frontend. | `backend/test/auth.test.js`, `limiter.test.js` |
| I-G | Outside development/test, `JWT_SECRET` must also have at least 8 distinct characters, in addition to 32+ characters and the placeholder prefixes. Test: the low-entropy case in `JWT_SECRET checks apply ...`. | `backend/src/app.js`, `backend/test/config.test.js` |

Unverified after fix pass 2 (needs Linux, a running container, Caddy or a browser):

- 0600 on backup files, and the failed-backup cleanup path (force `db.backup` to fail, check `backups/` has no new file).
- `docker compose exec blog printenv NODE_ENV` prints `production` even when `.env` sets `NODE_ENV=development`.
- HSTS with `includeSubDomains` on a response through real Caddy.
- The new CSP in a browser, with no console violations.
- The dev override running: the developer reported the image build succeeded and `compose config` OK; the docs pass did not re-run them.

Residual risk for M-A: the exemption covers an admin who logged in from the same client (IPv4 address or IPv6 /64) within the last 24 hours and no restart since. A new address, or a restart that wiped the list, leaves the admin subject to the global cap.

#### Final re-audit (2026-10-11)

Audited: the uncommitted working tree on branch `feat/deployment-plan` after fix pass 2 (no commit to cite; line numbers refer to that tree, and the docs pass re-read them in the code). Method (auditor): code reading plus `npm test` (17 of 17 pass; also seen by the docs pass). Not exercised: Docker, Caddy, a browser, Linux file modes.

Outcome: no Critical, High or Medium findings.

- Closed in code: M-A, L-A, L-B, L-C, L-D, L-E, I-E, I-G. No regression found in M1, L1 to L8, L10, I2, I3.
- M-A checked: a client enters the `knownGood` map only after a successful bcrypt check (`backend/src/routes/user.js:74-80`; `knownGood.set` comes after the `!row || !ok` rejection). The per-client cap of 10 still applies to exempt clients. A restart loses the exemption (accepted).
- New findings, all **Open** (not fixed): N1, N2 and the informational I-H to I-N below.
- Still open from before: I-A, I-B, I-C, I-D. Accepted: I-F, L9, I1, I4, I5.

| ID | Severity | Status |
|---|---|---|
| N1 | Low | Open |
| N2 | Low / Informational | Open |
| I-H | Informational | Open |
| I-I | Informational | Open |
| I-J | Informational | Open |
| I-K | Informational | Open |
| I-L | Informational | Open |
| I-M | Informational | Open (trade-off) |
| I-N | Informational | Open |

##### N1: security headers skipped for `/uploads*` look-alike paths

- Severity: Low. Status: Open.
- Location: `backend/src/app.js:32` (`!req.path.startsWith('/uploads')`); SPA fallback at `app.js:80`.
- Description: the header middleware skips every path that merely begins with `/uploads`. The real `/uploads` static route (`app.js:58`) matches only `/uploads` and `/uploads/...`, so `/uploadsx` or `/uploads-foo` skips the headers and then falls through to the SPA fallback (`app.get('*')`, registered only when the frontend is built, as in the Docker image). The response is `index.html` with no CSP, `X-Frame-Options`, `nosniff` or `Referrer-Policy`.
- Exploit scenario: an attacker frames `https://<domain>/uploadsx` (it serves the SPA) on a hostile page and overlays UI on the login page (clickjacking). Impact is limited by the `SameSite=Lax` cookie, which is not sent in cross-site subframes. Reasoned from the code; not tried in a browser.
- Fix: `if (!(req.path === '/uploads' || req.path.startsWith('/uploads/')))`, plus a test that `/uploadsx` carries the headers. Verify: `curl -sI http://localhost:3000/uploadsx` shows `Content-Security-Policy` and `X-Frame-Options: DENY`.

##### N2: `docker-compose.dev.yml` is unsafe outside a local machine

- Severity: Low / Informational. Status: Open.
- Location: `docker-compose.dev.yml:6-14`; `backend/src/app.js:22-28`.
- Description (files read; the CORS behavior is the auditor's reading of the `cors` package and was not run):
  - `NODE_ENV: development` makes `isDevLike()` true: the auth cookie loses `Secure` and the `JWT_SECRET` checks are skipped.
  - With `CLIENT_ORIGIN` unset (it is in neither the root `.env.example` nor the override), `cors({ origin: undefined, credentials: true })` answers `Access-Control-Allow-Origin: *`. Browsers refuse credentialed reads with `*`, but any site can read the public GET API of that localhost instance.
  - `TRUST_PROXY` defaults to `1` (`app.js:22`) and there is no proxy, so `X-Forwarded-For` is spoofable and the login limiter can be bypassed (same condition as I-L).
  - The override sets no Compose project name and no separate volume. Run in the same directory as the production stack, it mounts the production `blog-data` volume (Compose prefixes it with the project name, which defaults to the directory name) with dev settings.
  - `!override` and `!reset` need Compose 2.24 or newer.
- Exploit scenario: the file is run on the droplet by mistake: non-Secure cookie, weak secret accepted, production data served by a dev-mode app published on `127.0.0.1:3000`.
- Fix: in the override set `CLIENT_ORIGIN` (for example `http://localhost:3000`) and `TRUST_PROXY: "0"`, and add `name: blogme-dev` (or a separate volume) so dev data and production data never share a volume. Until then: never run it on the server (warnings in [development.md](development.md#docker-local) and [deploy.md](deploy.md#never-use-the-dev-override-on-the-server)).

##### Informational (final re-audit)

| ID | Location | Observation | Fix | Status |
|---|---|---|---|---|
| I-H | `backend/src/scripts/backup.js:10-16` | Backup race: the stamp has one-second resolution and the temp path is always `<file>.tmp`. Two runs in the same second (cron plus a manual run) open the same `.tmp` (`'w'` truncates it) and the second rename can overwrite the first; a failing run deletes the other run's temp file. Impact: one lost or corrupted backup, not a leak. | Put the pid (or a random suffix) in the temp name, or take a lock. | Open |
| I-I | `backup.js:12-16`, `:26` | If the process is killed (SIGKILL, OOM, power loss) between creating the temp file and the rename, `blog-*.db.tmp` stays. Retention only matches `blog-*.db`, so stale temp files are never pruned and slowly use disk. They hold a full database copy (mode 0600). | Sweep `blog-*.db.tmp` older than a day at startup. | Open |
| I-J | `backup.js:8` | `mkdirSync(..., { mode: 0o700 })` applies the mode only when the directory is created; an existing `backups/` keeps its mode (a umask can only tighten it). | `chmodSync(dir, 0o700)` after `mkdirSync`. Check with `ls -ld` on the droplet (unverified). | Open |
| I-K | `backend/src/uploadDir.js:13-23` | The guard can be bypassed with a symlink: `real()` falls back to `path.resolve` when the path does not exist yet, so a symlink to a not-yet-existing target is not resolved. Also `rel.startsWith('..')` (`:22`) misclassifies a child named `..x` as outside its parent. Needs an operator to set `UPLOAD_DIR`; not remotely exploitable. | Resolve the nearest existing ancestor; test `rel === '..'` or `rel.startsWith('..' + path.sep)`. | Open |
| I-L | `backend/src/app.js:22` | `TRUST_PROXY` defaults to `1`, which fails open when no proxy is in front (dev override, direct exposure): `X-Forwarded-For` is then client-controlled. Same condition as I-A. | Default to `0` and set it in production compose, or document loudly. | Open |
| I-M | `backend/src/routes/user.js:21,80` | The known-good exemption (M-A) also covers every client behind the admin's NAT address or IPv6 /64, and any valid account that logs in, not only the admin. They skip the global cap but keep the per-client cap of 10. | Accept for a single-author blog, or limit the exemption to the admin role. | Open (trade-off) |
| I-N | `backend/test/` | Test gaps: no test for `backup.js`, for the CSP against the built frontend, for the 24 hour known-good expiry, or for the headers on `/uploadsx` (N1). | Add tests. | Open |

##### Unverified after the final re-audit

Needs Linux, Docker, Caddy or a browser: 0600 on backup files and the failed-backup cleanup; `docker compose exec blog printenv NODE_ENV` prints `production`; HSTS through Caddy and Caddy overwriting `X-Forwarded-For`; the CSP in a browser.

#### Original finding text

The entries below are the findings as reported, before fix pass 2; their "Fix"/"Until fixed" lines are historical. Current status is in the table above and in [Fix pass 2](#fix-pass-2-2026-10-11).

#### M-A: global login lockout can be used against the owner

- Severity: Medium (design trade-off).
- Location: `backend/src/routes/user.js:13-16` (constants, `globalFails`), `:37` (`isLimited`), `:43-44` (`recordFail`), `:57` (check at the top of `/login`).
- Description: once 100 failed logins are recorded from any clients in a fixed 15-minute window, `isLimited` returns true for every request and `/login` answers 429 to everyone, including the admin with the right password. The window is fixed from the first failure and is not extended by further failures; the per-client limit is 10 failures.
- Exploit scenario: an attacker with about 10 IPv4 addresses (10 failures each) or many IPv6 /64 prefixes sends 100 bad logins, then repeats when the window ends. The admin cannot log in while this continues. Only login is blocked; the blog stays readable and existing sessions keep working (the limit is checked only in `/login`).
- Fix options (a decision is needed; none implemented): exempt IPs that logged in successfully recently, delay responses instead of blocking, count failures per username, or alert on global-limit hits.
- Known trade-off until decided. When locked out: wait for the window to end (up to 15 minutes), or restart the container (`docker compose restart blog`), which clears the in-memory counters. See [operations.md troubleshooting](operations.md#troubleshooting).

#### L-A: failed backup leaves a 0-byte file that counts toward retention

- Severity: Low.
- Location: `backend/src/scripts/backup.js:15` (file created empty), `:17-27` (`db.backup`, `.catch` only logs).
- Description: the target file is created with mode 0600 before `db.backup` runs. If the backup fails, the empty file stays and the retention listing (`:21`, newest 14 `blog-*.db`) counts it, so repeated failures can push good backups out. The script exits with code 1 on failure, so cron sees the error (exit code read from the code; not run with a forced failure).
- Fix: `unlink` the file in the failure path, or back up to a `.tmp` name with mode 0600 and `rename` on success (the retention regex then ignores the temp file). Verify by making `db.backup` fail and checking that `backups/` has no new file.

#### L-B: CSP lacks `base-uri`, `form-action`, `object-src`

- Severity: Low.
- Location: `backend/src/app.js:33-34`.
- Description: the policy has `default-src 'self'`, `img-src 'self' https: data:`, `style-src 'self' 'unsafe-inline'`, `font-src 'self' data:` and `frame-ancestors 'none'`. `base-uri` and `form-action` do not fall back to `default-src`, so they are unrestricted. `object-src` does fall back to `default-src 'self'`, so it is allowed from the same origin only (the auditor lists it as missing; add it explicitly for clarity).
- Fix: append `base-uri 'self'; form-action 'self'; object-src 'none'`. Check the login page, a post with images and the editor in a browser for console violations (not done).

#### L-C: HSTS is minimal

- Severity: Low.
- Location: `Caddyfile.snippet:8` (`header Strict-Transport-Security "max-age=31536000"`).
- Description: no `includeSubDomains`, no `preload`. Subdomains of the blog's domain are not covered.
- Fix: add `includeSubDomains` only if every subdomain serves HTTPS; do not add `preload` unless you intend to submit the domain to the preload list (hard to undo). Not tested against a real Caddy.

#### L-D: `NODE_ENV` in `.env` overrides the Dockerfile default

- Severity: Low.
- Location: `Dockerfile:11` (`ENV NODE_ENV=production`), `docker-compose.yml:6` (`env_file: .env`), `backend/.env.example:12` (`NODE_ENV=development`), `backend/src/env.js:3`.
- Description: variables from `env_file` take precedence over the image's `ENV`. Copying `backend/.env.example` to the server's `.env` sets `NODE_ENV=development`, which makes `isDevLike()` true: the auth cookie loses `Secure`, the `JWT_SECRET` length and placeholder checks are skipped, and CORS is enabled with `CLIENT_ORIGIN`. The root `.env.example` says NODE_ENV is set in the Dockerfile, which is only true if `.env` does not set it. (Precedence is standard Docker behavior; not run here.)
- Fix: set `environment: NODE_ENV: production` in `docker-compose.yml` (it wins over `env_file`), or make the app fail fast when running in a container with a dev-like value. Verify with `docker compose exec blog printenv NODE_ENV`.
- Until fixed: check that the server `.env` has no `NODE_ENV` line, and use the root `.env.example`, not `backend/.env.example`.

#### L-E: `UPLOAD_DIR` guard does not refuse `<dbdir>/backups`

- Severity: Low.
- Location: `backend/src/uploadDir.js:20-23`; backups go to `<dbdir>/backups` (`backup.js:7`).
- Description: the guard only refuses a directory that equals or contains the DB directory. `UPLOAD_DIR=/app/data/backups` is inside the DB directory, so it passes, and `/uploads` would then publicly serve the database copies, including password hashes.
- Fix: also refuse any `UPLOAD_DIR` that equals, contains or lies inside `<dbdir>/backups`; add a test next to `uploadDir refuses a dir that contains the DB file or its directory`.
- Until fixed: leave `UPLOAD_DIR` unset (default `<dbdir>/uploads`).

#### Informational

| ID | Observation | Action |
|---|---|---|
| I-A | `req.ip` must be the real client behind Docker and Caddy. If it is the Caddy container or the Docker gateway address, all clients share one limiter key and lock out sooner (10 failures instead of 10 per client). Depends on `TRUST_PROXY` (default `1`) matching the real hop count. Not checked on a droplet. | Verify, see [operations.md](operations.md#troubleshooting). |
| I-B | `ADMIN_PASSWORD` is exposed through `env_file`, `docker inspect` and shell history if set inline. | Prefer the hidden prompt; remove `ADMIN_PASSWORD` from `.env` after creating the admin. |
| I-C | `bcrypt.compareSync` (`user.js:65`) blocks the event loop for each login attempt (cost 12), so a flood of login requests degrades the whole site. The login limiters reduce but do not remove this. Availability note only. | Accept or move to async `compare`. |
| I-D | The `blog-net` attachment of Caddy is lost if the network is recreated, and `docker compose down` can fail while Caddy is still attached. | Disconnect Caddy first, or declare `blog-net` external in Caddy's compose. See [deploy.md](deploy.md). |
| I-E | Fixed in fix pass 2, Closed by the final re-audit. Original: no test for the Secure cookie in production, none for the CSP against the built frontend, and the global-limit test depended on test order. The CSP test gap is tracked again as I-N. | None. |
| I-F | `img-src` allows any `https:` image, so an author-written Markdown image can load a tracking pixel from a third party. Admin-authored content only. | Accept, or restrict `img-src` to `'self'`. |
| I-G | Fixed in fix pass 2 (8+ distinct characters, `app.js:13`), Closed by the final re-audit. Original: the placeholder check rejects only a few prefixes. | Generate with `openssl rand -hex 32`. |

#### Next actions

Ordered by value (after the final re-audit; nothing below has been fixed):

1. N1: exact-match the `/uploads` skip in `app.js:32` and add a test for `/uploadsx` headers.
2. N2: in `docker-compose.dev.yml` set `CLIENT_ORIGIN` and `TRUST_PROXY: "0"`, and add `name: blogme-dev` or a separate volume.
3. I-H and I-I: unique temp name (or lock) in `backup.js`, and sweep stale `blog-*.db.tmp` at startup.
4. I-K: harden the `uploadDir.js` guard (nearest existing ancestor, exact `..` test). I-J: `chmod` the backups directory.
5. I-A and I-L: verify on the droplet that `req.ip` is the real client address; consider defaulting `TRUST_PROXY` to `0`.
6. I-B: use the hidden prompt for `createAdmin`, and remove `ADMIN_PASSWORD` from `.env` afterwards.
7. I-D: disconnect Caddy before `docker compose down`, or declare `blog-net` external in Caddy's compose.
8. I-C: accept the blocking `bcrypt.compareSync`, or move to async `compare`. I-M, I-N: decide, and add tests.
9. Droplet verification checklist (all unverified):
   - `ls -l backups/` shows 0600 files and `ls -ld backups` shows 0700; force `db.backup` to fail and check no new file remains.
   - `docker compose exec blog printenv NODE_ENV` prints `production`.
   - `curl -sI https://<domain>/health` shows `Strict-Transport-Security`; `req.ip` is the real client (I-A); Caddy overwrites `X-Forwarded-For`.
   - CSP in a browser: login page, a post with images and the editor load with no console violations.
   - Caddy reaches `blog:3000` on `blog-net`.
