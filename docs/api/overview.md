# API overview

Verified against `backend/src` and by running every endpoint with `curl` against a throwaway database (2026-10-05). The security hardening pass of 2026-10-11 (admin-only writes, logout revocation, headers, lockout) was read from the diff and covered by backend tests (17 pass after fix pass 2); the `curl` examples below were not all re-run afterwards (see [security.md](../security.md)). The Mongo-era API (`/categories`, `/user/register`, FormData uploads, email login) is gone; none of it exists in the lite build. The only upload is the raw-body admin image upload described under [Uploads](#uploads).

Base: `/api/v1`. IDs are `_id` strings of integers. Success responses have `status: "success"`; errors are `{ "status": "fail", "message": "..." }`.

Auth is an HttpOnly cookie named `token`, set by login. The examples use a cookie jar:

```sh
BASE=http://localhost:3000/api/v1
```

## Endpoints

| Method and path | Auth | Success |
|---|---|---|
| `POST /user/login` | no | 200, sets cookie |
| `POST /user/logout` | no (cookie used if valid) | 200, clears cookie, revokes all tokens |
| `GET /user/profile` | any logged-in user | 200 |
| `GET /posts` | no | 200 |
| `GET /posts/:id` | no | 200 |
| `POST /posts/create` | admin | 201 |
| `PUT /posts/:id` | admin | 200 |
| `DELETE /posts/:id` | admin | 200 with the deleted object in the body (not 204) |
| `GET /category` | no | 200 |
| `GET /category/:id` | no | 200 |
| `POST /category/create` | admin | 201 |
| `PUT /category/:id` | admin | 200 |
| `DELETE /category/:id` | admin | 200 with the deleted object in the body |
| `POST /uploads` | admin | 201, raw image body |
| `GET /uploads/:name` (outside `/api/v1`) | no | 200 image bytes |
| `GET /health` (outside `/api/v1`) | no | 200 `{ "status": "ok" }` |

Paths are literal: `/category` is singular; creates are `/posts/create` and `/category/create`. There is no register route.

## Cross-cutting rules

| Rule | Behavior |
|---|---|
| Write content type | `POST`/`PUT` on posts and categories, and `POST /user/login`, require `Content-Type: application/json`, otherwise 415 `Content-Type must be application/json`. `POST /user/logout` also requires it (415 otherwise). `DELETE` takes no body and does not check it. |
| Check order on writes | Auth (401), then admin role (403), then content type (415), then id, then validation. An unauthenticated request with a wrong content type gets 401, not 415. |
| Authorization | Every write (posts, categories, uploads) needs `role = admin`; a logged-in user with another role gets 403 `Forbidden`. Only the admin role exists in practice, so this is a safeguard (covered by a test). |
| Auth failure | Missing, invalid, expired or revoked token (stale or missing `tv` claim), or a user id that no longer exists: 401 `Not authenticated`. |
| Ids in URLs | Must be 1 to 15 digits and greater than 0. Anything else (`abc`, `0`, `-1`) or an unknown id is 404 (`Post not found` / `Category not found`), never 500. |
| Unknown route | JSON 404 `{"status":"fail","message":"Not found"}` for any unknown `/api/...` path. When the built frontend is present (`public/index.html`, as in the Docker image), other `GET` paths return `index.html` (SPA fallback); other methods still get the JSON 404. Without the built frontend (local backend dev) every unknown path is the JSON 404. |
| Malformed JSON | 400 `Invalid JSON body`. |
| Body size | Over 100 KB: 413 `request entity too large` (JSON routes). `POST /uploads` has its own 5 MB limit. |
| Server error | 500 `Internal server error` (details only in the server log). |
| Login rate limit | See [POST /user/login](#post-userlogin). |

Status codes in use: 200, 201, 400, 401, 403, 404, 413, 415, 429, 500. The PLAN.md contract lists only 400, 401, 404 and 201; 403, 413, 415 and 429 are additions (see [milestones.md](../milestones.md#phase-1-sqlite-backend-backend)).

No response includes `password_hash` or the JWT.

## User

### POST /user/login

Body: `{ "username": "<name>", "password": "<password>" }` (JSON only).
Response keys: `status`, `message` (`Login successful`), `user: { _id, username, role }`. The token is not in the body.
Cookie: `token`, HttpOnly, `SameSite=Lax`, `Path=/`, `Max-Age=604800` (7 days), `Secure` unless `NODE_ENV` is `development` or `test`. The JWT carries `sub` and `tv` (token version).

Codes:
- 200 success.
- 401 `Invalid credentials` for every failure: unknown user, wrong password, missing or non-string fields. The same bcrypt work is done for unknown users to keep timing similar.
- 415 not JSON.
- 429 `Too many attempts, try again later`.

Rate limit (in memory, per client IP as seen through `trust proxy`, default 1 hop, set with `TRUST_PROXY`; IPv6 clients are counted per /64 prefix):
- Only failed logins count. The 10th failure is still a 401; from the 11th request on, the response is 429 until the window ends.
- The window is fixed, 15 minutes from the first failure in it (not sliding).
- A successful login clears that IP's counter, but only while the IP is under the limit. Once blocked, even the correct password gets 429 until the window expires.
- Global cap: 100 failed logins from all clients together in a window also produces 429 until that window ends, for every client except those with a successful login in the last 24 hours (the exemption list is in memory). An exempt client is still bound by the per-client cap of 10. State, including the exemption, is lost on restart; after a restart during an attack the owner is not exempt until the next successful login.

```sh
curl -i -c jar.txt -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"change-me"}' $BASE/user/login
```

Example response body:

```json
{"status":"success","message":"Login successful","user":{"_id":"1","username":"admin","role":"admin"}}
```

### POST /user/logout

Requires `Content-Type: application/json` (415 otherwise); send `{}`. No auth check: with a valid cookie it adds 1 to the user's `token_version`, which revokes every token issued so far (all devices); without one it only clears the cookie. Always 200 `{ "status": "success", "message": "Logged out" }`. Existing sessions from before the change have no `tv` claim and need a new login (see [architecture.md](../architecture.md#auth-flow)).

```sh
curl -b jar.txt -c jar.txt -X POST -H 'Content-Type: application/json' -d '{}' $BASE/user/logout
```

### GET /user/profile

Auth required. Response keys: `status`, `user: { _id, username, role }`. Codes: 200, 401.

```sh
curl -b jar.txt $BASE/user/profile
```

## Posts

Post object keys (exactly these): `_id`, `title`, `content` (Markdown), `category` (category `_id` string or `null`), `createdAt`, `updatedAt` (ISO 8601 UTC, for example `2026-10-05T16:47:43.579Z`). There is no author field in responses.

Input rules: `title` a string, 1 to 200 characters after trimming (stored trimmed); `content` a non-empty string (stored as sent). `category` is an existing category id as a string or number, `null`, or `""` (treated as null); anything else, or an id that does not exist, is 400 `category does not exist`.

### GET /posts

Optional `?category=<id>`. Response: `status`, `posts`, newest first (`created_at DESC`, then `id DESC`). No pagination. A `category` value that is not a positive integer, or matches nothing, returns 200 with `posts: []` (not 400 or 404).

```sh
curl "$BASE/posts?category=1"
```

### GET /posts/:id

Response: `status`, `message` (`Post fetched`), `postFound`. Codes: 200, 404.

```sh
curl $BASE/posts/1
```

### POST /posts/create

Admin required. Body: `{ "title": "...", "content": "...", "category": "1" }`. `category` may be omitted (stored as null). Response: `status`, `message` (`Post created`), `newPost`. Codes: 201, 400, 401, 403, 413, 415.

```sh
curl -b jar.txt -H 'Content-Type: application/json' \
  -d '{"title":"Hello","content":"# Hi","category":"1"}' $BASE/posts/create
```

### PUT /posts/:id

Admin required. `title` and `content` are required on every update (400 `content is required` if missing). `category` is optional: absent keeps the stored value, `null` clears it, an id sets it. `updatedAt` is refreshed; `createdAt` is not. Response: `status`, `message` (`Post updated`), `postUpdated`. Codes: 200, 400, 401, 403, 404, 413, 415.

```sh
curl -b jar.txt -X PUT -H 'Content-Type: application/json' \
  -d '{"title":"New","content":"Body"}' $BASE/posts/1
```

### DELETE /posts/:id

Admin required. Response: `status`, `message` (`Post deleted`), `deletedPost` (the post as it was). Codes: 200, 401, 403, 404. A second delete of the same id is 404.

```sh
curl -b jar.txt -X DELETE $BASE/posts/1
```

## Categories

Category object keys: `_id`, `categoryName`, `categoryDescription` (string or `null`), `postCount` (integer, computed per request).

Input rules: `categoryName` a string, 1 to 100 characters after trimming; `categoryDescription` a string up to 1000 characters or `null`. A duplicate name is 400 `Category already exists` (on create and on rename).

### GET /category

Response: `status`, `categories`, ordered by name.

```sh
curl $BASE/category
```

### GET /category/:id

Response: `status`, `message` (`Category fetched`), `categoryFound`. Codes: 200, 404.

```sh
curl $BASE/category/1
```

### POST /category/create

Admin required. Body: `{ "categoryName": "...", "categoryDescription": "..." }`; `categoryName` is required, description optional. Response: `status`, `message` (`Category created`), `categoryCreated`. Codes: 201, 400, 401, 403, 413, 415.

```sh
curl -b jar.txt -H 'Content-Type: application/json' \
  -d '{"categoryName":"Projects","categoryDescription":"Write-ups"}' $BASE/category/create
```

### PUT /category/:id

Admin required. Same input rules as create, but absent fields keep their stored value (a partial body is accepted). Response: `status`, `message` (`Category updated`), `categoryUpdated`. Codes: 200, 400, 401, 403, 404, 413, 415.

```sh
curl -b jar.txt -X PUT -H 'Content-Type: application/json' \
  -d '{"categoryName":"Projects","categoryDescription":"New"}' $BASE/category/1
```

### DELETE /category/:id

Admin required. Response: `status`, `message` (`Category deleted`), `deletedCategory` (with `postCount` as it was before the delete). Posts in the category are kept with `category` set to `null`. Codes: 200, 401, 403, 404.

```sh
curl -b jar.txt -X DELETE $BASE/category/1
```

## Uploads

Added in Phase 7. The editor UI that calls this is described in [../writing-posts.md](../writing-posts.md) (not clicked through in a browser). Verified with `curl` against a throwaway database and upload directory (2026-10-05).

### POST /uploads

Admin required (`/api/v1/uploads`). The body is the raw image bytes, not JSON and not multipart. `Content-Type` must be one of `image/png`, `image/jpeg`, `image/gif`, `image/webp`; maximum 5 MB. The server also checks the magic bytes (PNG, JPEG, GIF87a/GIF89a, RIFF...WEBP), and they must match the declared `Content-Type`. The stored name is a random UUID plus an extension from the detected type (`.png`, `.jpg`, `.gif`, `.webp`); the client's filename is never used.

Response keys: `status`, `message` (`Image uploaded`), `url` (`/uploads/<uuid>.<ext>`), `name`.

Codes (checked in this order: auth, then body size and type, then content):
- 201 stored.
- 403 `Forbidden` for a logged-in non-admin.
- 401 `Not authenticated`. Auth runs before the body is read; an unauthenticated 6 MB upload got 401.
- 413 `Image too large (max 5 MB)`.
- 415 for any of: a `Content-Type` that is not one of the four (including `image/svg+xml` and `application/json`; message `Upload a PNG, JPEG, GIF or WebP image as the raw request body`), an empty body (same message), or bytes that are not a real image of the declared type (SVG sent as `image/png`, or PNG bytes sent as `image/jpeg`; message `File content does not match an allowed image type`). SVG is always rejected.

```sh
curl -b jar.txt -X POST -H 'Content-Type: image/png' \
  --data-binary @photo.png $BASE/uploads
```

```json
{"status":"success","message":"Image uploaded","url":"/uploads/<uuid>.png","name":"<uuid>.png"}
```

Use `--data-binary` (not `-d`, which mangles binary data). Put `![alt](/uploads/<uuid>.png)` in a post's Markdown to show the image.

### GET /uploads/:name

No auth: uploaded images are public to anyone who has the URL. Not under `/api/v1`.

- 200: the image bytes, with `Content-Type` from the file extension and these headers:
  - `Cache-Control: public, max-age=31536000, immutable`
  - `X-Content-Type-Options: nosniff`
  - `Content-Security-Policy: default-src 'none'; img-src 'self'; sandbox`
- 404 JSON `{"status":"fail","message":"Not found"}` for a missing file (not `index.html`), and for `/uploads/` itself (no directory listing). The same `nosniff` and CSP headers are on the 404.
- Other seen results: a `../` path (sent with `--path-as-is`) returned 403 `Forbidden`; `POST /uploads/x.png` returned 405.

```sh
curl -I http://localhost:3000/uploads/<uuid>.png
```

Files are never modified or deleted by the API (there is no delete endpoint), so a long cache lifetime is safe. Images keep their EXIF data (such as GPS location); the server does not strip it.

## Security headers

Every response except `/uploads/*` carries `Content-Security-Policy` (`default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` and `X-Frame-Options: DENY`. `/uploads/*` keeps its own stricter CSP. `X-Powered-By` is disabled. Seen in a test (`security headers on app responses`); not checked in a browser, so whether the CSP blocks anything the frontend needs is unverified.

## Health

```sh
curl http://localhost:3000/health   # {"status":"ok"}
```

It does not touch the database; it only shows the process is up.
