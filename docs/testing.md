# Manual testing guide

**These steps have not been run by the author of this guide.** The guide was written from the code, `PLAN.md` and the other docs only; the owner asked that nothing be run while writing it. Where an expected result comes from the code but was never seen, it says so. Follow the steps in order and fill in the [results log](#8-results-log).

What was verified before, and what was not (details: [milestones.md](milestones.md)):

| Area | Status before this guide |
|---|---|
| Backend API with `curl` (login, cookie flags, CRUD, 401/404/413/415/429, uploads PNG, SVG and fake-file rejection, upload headers) | Seen to work by developers on Windows, throwaway database. Re-checking it here is a regression check. |
| Server restart keeps data (outside Docker) | Never run (only data on disk was confirmed). Step 1.3 covers it. |
| Backup pruning to 14 files | Read in code only. Never run. |
| JPEG, GIF and WebP uploads | Code read only; only PNG was uploaded. |
| Everything in a browser: login, reload, logout, redirects, 404 page, Markdown rendering, the whole editor (toolbar, paste, drag-drop, picker, preview, Save disabled), mobile menu, dark-mode look, 429 message | **Never verified.** Sections 3 and 4 are the first real run. |
| Container (dev override, Docker 29.8.1): build, non-root, `/health`, SPA fallback, admin, login cookie, backup, upload, data kept across `down` then `up -d`, memory | Reported by the developer; not re-run by the docs pass. |
| Secure cookie over `http://localhost` in a browser | Never tried (see [section 5](#5-docker)). |
| Base `docker-compose.yml` with a real Caddy attached to `blog-net`, droplet, Caddy, cron, HTTPS, request body limit, test restore | Phase 5, not started. Unverified. |
| Automated backend tests (`npm test` in `backend/`, 17 tests, added in the 2026-10-11 security pass) | Seen passing by the docs pass. They cover security behavior only (admin-only writes, logout revocation, headers, `Secure` cookie in production, secret checks incl. the distinct-character rule, limiter incl. the known-good exemption, `TRUST_PROXY`, `UPLOAD_DIR` guard incl. the backups directory, migration). The rest of the API is still manual. See the [appendix](#appendix) and [security.md](security.md). |

Conventions: `$BASE` is `http://localhost:3000/api/v1` and `$ORIGIN` is `http://localhost:3000`. "Troubleshooting" links point to the table in [operations.md](operations.md#troubleshooting); the row name is given in each link text. Each step has a checkbox for you to tick.

## 0. Prerequisites and a clean start

- [ ] **0.1 Node 22 or newer.** Run `node -v`. Expect `v22.x` or higher (`engines.node` is `>=22`). Fails: install Node 22+. `better-sqlite3` will not load on older versions.
- [ ] **0.2 Install dependencies.**
  ```sh
  cd backend && npm install
  cd ../frontend && npm install
  ```
  Expect no errors. If `better-sqlite3` fails to build, check the Node version first.
- [ ] **0.3 Use a throwaway database.** An old `backend/data/blog.db` from earlier work may hold posts and an admin you do not remember (the stale-database pitfall: you test against data you did not create, or log in with a password you forgot). Use a separate path under the git-ignored `data/` folder. Create `backend/.env` (copy `.env.example`) and set:
  ```
  PORT=3000
  JWT_SECRET=change-me-for-local-testing
  DB_PATH=./data/test/blog.db
  CLIENT_ORIGIN=http://localhost:5173
  NODE_ENV=development
  ```
  A relative `DB_PATH` is resolved against `backend/`, so the file is `backend/data/test/blog.db` and uploads go to `backend/data/test/uploads/`. Do not use a name like `data-test/`: only `data` and `*.db*` are in `backend/.gitignore`, so uploads in `data-test/` would show up in `git status`. To start clean at any time, stop the server and delete the folder: `rm -rf backend/data/test` (PowerShell: `Remove-Item -Recurse -Force backend\data\test`).
- [ ] **0.4 Ports are free.** Backend 3000, Vite 5173. Check nothing else (an old container, an old server) uses 3000: `curl http://localhost:3000/health` should fail to connect before you start. Fails: stop the other process; if a Docker container from section 5 is up, `docker compose ... stop`.
- [ ] **0.5 Create the admin from any directory.** Scripts open the same database wherever you run them (they resolve `.env` and `DB_PATH` against `backend/`). Test it from the repo root and from elsewhere:
  ```sh
  cd /path/to/blog-project
  ADMIN_PASSWORD='change-me-12345' node backend/src/scripts/createAdmin.js admin admin@example.com
  ```
  Expect `Admin "admin" created.` (a harmless dotenv "injected env" line may print first). Password must be 12+ characters. Run it again: expect `An admin already exists; nothing to do.` Run it with a short password on a fresh database: expect exit code 1. The password is read from `ADMIN_PASSWORD` (or a hidden prompt if unset); it is no longer accepted as an argument. The inline variable still lands in shell history, so use a throwaway one here. Fails with "cannot log in later": [troubleshooting, "Admin created but cannot log in"](operations.md#troubleshooting).
- [ ] **0.5a Seed sample data (optional, before the browser checks).** In `backend/`: `node src/scripts/seed.js`. Expect `Seed done: 5 categories and 14 posts added.`; a second run prints `0 categories and 0 posts added.` Without an admin it exits 1 (`No admin found. Run: node src/scripts/createAdmin.js`). Test data only; never on the droplet. Checks that expect an empty blog (for example an empty posts list) will see these posts, so use a fresh database for those. Script output verified 2026-10-11; viewing the posts in a browser was not verified.
- [ ] **0.6 Start the backend.** In `backend/`: `npm run dev`. Expect `BlogMe Lite listening on port 3000`. Fails with `JWT_SECRET is not set`: [troubleshooting](operations.md#troubleshooting) first row.
- [ ] **0.7 Windows note.** Use Git Bash for the `curl` steps if you can (commands below are bash). PowerShell variants are given where they differ. In PowerShell always type `curl.exe`; plain `curl` is an alias for `Invoke-WebRequest` and behaves differently.

## 1. Backend smoke tests with curl

Set variables.

bash:
```sh
BASE=http://localhost:3000/api/v1
ORIGIN=http://localhost:3000
cd /tmp   # or any scratch folder; jar.txt will be created here
```

PowerShell (one-time helpers; `J` writes JSON to a temp file without a byte-order mark, which avoids PowerShell's quote-stripping and BOM problems):
```powershell
$BASE = "http://localhost:3000/api/v1"; $ORIGIN = "http://localhost:3000"
function J($s) { $f = [IO.Path]::GetTempFileName(); [IO.File]::WriteAllText($f, $s); "@$f" }
```
In PowerShell, replace `-d '<json>'` with `-d (J '<json>')`, replace `$BASE` as shown, and use `curl.exe`. Line continuation is a backtick, not `\`. Examples below are bash; the first one of each kind also shows PowerShell.

Cookie jar: `-c jar.txt` saves cookies, `-b jar.txt` sends them. A line starting `#HttpOnly_localhost` in `jar.txt` is normal.

- [ ] **1.1 Health.** `curl -s $ORIGIN/health`. Expect `{"status":"ok"}`.
- [ ] **1.2 Login failure is generic.**
  ```sh
  curl -i -H 'Content-Type: application/json' -d '{"username":"admin","password":"wrong-password"}' $BASE/user/login
  curl -i -H 'Content-Type: application/json' -d '{"username":"nobody","password":"wrong-password"}' $BASE/user/login
  ```
  PowerShell: `curl.exe -i -H "Content-Type: application/json" -d (J '{"username":"admin","password":"wrong-password"}') "$BASE/user/login"`.
  Expect both: `401` and `{"status":"fail","message":"Invalid credentials"}` (identical, so usernames do not leak). No `Set-Cookie`. Failures count toward the rate limit, but a later successful login (1.3) resets the counter.
- [ ] **1.3 Login success and cookie flags.**
  ```sh
  curl -i -c jar.txt -H 'Content-Type: application/json' -d '{"username":"admin","password":"change-me-12345"}' $BASE/user/login
  ```
  Expect `200`, body `{"status":"success","message":"Login successful","user":{"_id":"1","username":"admin","role":"admin"}}` (no token in the body) and a header like `Set-Cookie: token=...; Max-Age=604800; Path=/; ...; HttpOnly; SameSite=Lax`. In development there is **no** `Secure` flag (it is added only when `NODE_ENV=production`). Use the password you chose in 0.5.
- [ ] **1.4 Non-JSON login is 415.** `curl -i -d 'username=admin&password=x' $BASE/user/login` expect `415` `Content-Type must be application/json`.
- [ ] **1.5 Profile.** `curl -s -b jar.txt $BASE/user/profile` expect `{"status":"success","user":{...}}`. Without the cookie: `curl -i $BASE/user/profile` expect `401` `Not authenticated`.
- [ ] **1.6 Writes need the cookie.** Without `-b jar.txt`, each of these must return `401` `Not authenticated`:
  ```sh
  curl -i -H 'Content-Type: application/json' -d '{"title":"x","content":"y"}' $BASE/posts/create
  curl -i -H 'Content-Type: application/json' -d '{"categoryName":"x"}' $BASE/category/create
  curl -i -X PUT -H 'Content-Type: application/json' -d '{"title":"x","content":"y"}' $BASE/posts/1
  curl -i -X DELETE $BASE/posts/1
  curl -i -X DELETE $BASE/category/1
  ```
  An unauthenticated request with the wrong content type is also 401 (auth is checked first).
- [ ] **1.7 Create a category.**
  ```sh
  curl -s -b jar.txt -H 'Content-Type: application/json' -d '{"categoryName":"Projects","categoryDescription":"Write-ups"}' $BASE/category/create
  ```
  Expect `201`, `categoryCreated` with `_id` (note it as `CAT`, normally `"1"`), `categoryName`, `categoryDescription`, `postCount: 0`. Create the same name again: expect `400` `Category already exists`.
- [ ] **1.8 Create a post.**
  ```sh
  curl -s -b jar.txt -H 'Content-Type: application/json' -d '{"title":"Hello","content":"# Hi\n\nBody","category":"1"}' $BASE/posts/create
  ```
  Expect `201`, `newPost` with exactly `_id`, `title`, `content`, `category` (`"1"`), `createdAt`, `updatedAt`. Note the id as `POST`. Validation: an empty title, a missing `content`, a 201-character title, and `"category":"999"` each return `400` (the last: `category does not exist`).
- [ ] **1.9 List and fetch.** `curl -s $BASE/posts` expect `posts` newest first. `curl -s $BASE/posts/1` expect `postFound`. `curl -s $BASE/category` expect `categories` with `postCount: 1`. `curl -s "$BASE/posts?category=1"` lists the post; `?category=999` and `?category=abc` return `200` with an empty list.
- [ ] **1.10 Edit keeps the category when it is absent.** Note the `updatedAt` from 1.8, then:
  ```sh
  curl -s -b jar.txt -X PUT -H 'Content-Type: application/json' -d '{"title":"Hello 2","content":"Body 2"}' $BASE/posts/1
  ```
  Expect `postUpdated` with `category` still `"1"`, new title, `updatedAt` later than before, `createdAt` unchanged. Sending only `{"title":"x"}` expect `400` (`content is required`).
- [ ] **1.11 Edit clears the category with null.** Same call with `"category":null` added: expect `category: null`. Then set it back with `"category":"1"`. An unknown id returns `400`.
- [ ] **1.12 Bad ids are 404, never 500.** `curl -i $BASE/posts/abc`, `$BASE/posts/0`, `$BASE/posts/-1`, `$BASE/posts/99999`, `$BASE/category/abc`, `$BASE/category/99999`. Expect `404` JSON each (`Post not found` / `Category not found`). With the cookie: `-X DELETE $BASE/posts/abc` also 404.
- [ ] **1.13 Non-JSON write is 415.** With the cookie: `curl -i -b jar.txt -X POST -H 'Content-Type: text/plain' -d 'hi' $BASE/posts/create` expect `415`. Malformed JSON: `-H 'Content-Type: application/json' -d '{bad'` expect `400` `Invalid JSON body`.
- [ ] **1.14 Large JSON is 413.** Over 100 KB.
  bash:
  ```sh
  { printf '{"title":"x","content":"'; head -c 200000 /dev/zero | tr '\0' a; printf '"}'; } > big.json
  curl -i -b jar.txt -H 'Content-Type: application/json' --data-binary @big.json $BASE/posts/create
  ```
  PowerShell: `[IO.File]::WriteAllText("$PWD\big.json", '{"title":"x","content":"' + ('a' * 200000) + '"}')` then `curl.exe -i -b jar.txt -H "Content-Type: application/json" --data-binary "@big.json" "$BASE/posts/create"`.
  Expect `413` `request entity too large`.
- [ ] **1.15 Unknown API path is JSON 404.** `curl -i $BASE/nope` and `curl -i $ORIGIN/api/v1/nope`. Expect `404`, `Content-Type: application/json`, `{"status":"fail","message":"Not found"}`. Not HTML. (Local dev has no built frontend, so every unknown path is JSON 404.)
- [ ] **1.16 SQL-looking text is stored as text.**
  ```sh
  curl -s -b jar.txt -H 'Content-Type: application/json' -d '{"title":"x'"'"'); DROP TABLE posts;--","content":"1 OR 1=1"}' $BASE/posts/create
  ```
  PowerShell: `-d (J '{"title":"x'');DROP TABLE posts;--","content":"1 OR 1=1"}')` (a doubled `''` inside a single-quoted PowerShell string is one apostrophe).
  Expect `201`. `curl -s $BASE/posts` still works and returns that title verbatim, and the other posts are still there. Also try `$BASE/posts/1%20OR%201=1` (expect 404) and `"$BASE/posts?category=1%20OR%201=1"` (expect `200`, empty list).
- [ ] **1.17 Delete a post.** `curl -s -b jar.txt -X DELETE $BASE/posts/<id of the SQL post>`. Expect `200` with `deletedPost` (the object, not 204). Repeat: `404`.
- [ ] **1.18 Deleting a category keeps its posts.** `curl -s -b jar.txt -X DELETE $BASE/category/1` expect `200` with `deletedCategory` (with the `postCount` it had). Then `curl -s $BASE/posts/1`: the post exists and `category` is `null`. Recreate the category afterwards (1.7) for later steps; its id will now be `"2"`, and set post 1 back to it with a `PUT` containing `"category":"2"`.
- [ ] **1.19 Partial category update.** `curl -s -b jar.txt -X PUT -H 'Content-Type: application/json' -d '{"categoryDescription":"New text"}' $BASE/category/2` expect `200`, name unchanged. (This follows the code; PLAN.md does not mention partial updates.)
- [ ] **1.20 Logout clears the cookie.** `curl -i -b jar.txt -c jar.txt -X POST -H 'Content-Type: application/json' -d '{}' $BASE/user/logout` expect `200` `Logged out` (without the JSON header: `415`) and a `Set-Cookie: token=;` with an expiry in the past. Then `curl -i -b jar.txt $BASE/user/profile` expect `401`. Logout also revokes every other token issued to that user (a copy of the old cookie, saved before logout, now gets `401` too). Log in again (1.3) to continue.
- [ ] **1.21 Data survives a server restart (Phase 1 gap, never run).** Stop the server (`Ctrl+C`), start it again (`npm run dev`), then `curl -s $BASE/posts`. Expect the same posts. Your old cookie still works too (same `JWT_SECRET`): `curl -s -b jar.txt $BASE/user/profile`. Fails: check `DB_PATH` did not change between runs.
- [ ] **1.22 Rate limit: 429 after 10 failures (do this last in this section).** Rule: 10 failures per client (IPv6 per /64) per fixed 15 minutes; the 11th request is 429, even with the right password. A global cap of 100 failures from all clients per window also blocks every client that has not logged in successfully in the last 24 hours; clients with a recent successful login are exempt from the global cap only (the per-client cap of 10 still applies to them). Restarting the server clears the counters and the exemption list.
  bash:
  ```sh
  for i in $(seq 1 12); do curl -s -o /dev/null -w "%{http_code}\n" -H 'Content-Type: application/json' -d '{"username":"admin","password":"wrong-password"}' $BASE/user/login; done
  ```
  PowerShell: `1..12 | % { curl.exe -s -o NUL -w "%{http_code}`n" -H "Content-Type: application/json" -d (J '{"username":"admin","password":"wrong-password"}') "$BASE/user/login" }`.
  Expect `401` ten times, then `429` twice (the counter was reset by the successful login in 1.3 or 1.20). Then log in with the **correct** password: still `429` `Too many attempts, try again later`. Restart the backend (`Ctrl+C`, `npm run dev`) and log in: `200`. Fails (no 429 appears): [troubleshooting, "429 Too many attempts"](operations.md#troubleshooting) (and check you are not behind another proxy).

## 2. Upload tests

Log in first (1.3) so `jar.txt` holds a valid cookie. Always use `--data-binary` for files, never `-d`.

Test files. You can use any real small PNG, JPEG, GIF and WebP you have. Quick generated ones (tiny, valid enough for the API; the server only checks magic bytes):

bash:
```sh
printf 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' | base64 -d > t.png
printf 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' | base64 -d > t.gif
printf '\xff\xd8\xff\xe0JFIF-fake' > t.jpg            # passes the magic-byte check, will not render
printf 'RIFF\x00\x00\x00\x00WEBPVP8 ' > t.webp        # passes the magic-byte check, will not render
echo 'not an image' > fake.png
printf '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>' > t.svg
head -c 6000000 /dev/zero > big.png                   # 6 MB
```
PowerShell: `[IO.File]::WriteAllBytes("$PWD\t.png",[Convert]::FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="))` and the same for the GIF string; for the rest use `Set-Content -Encoding ascii` for `fake.png` and `t.svg`, and `[IO.File]::WriteAllBytes("$PWD\big.png", (New-Object byte[] 6000000))`. The fake JPEG and WebP can be written with `[IO.File]::WriteAllBytes` and `[byte[]](0xFF,0xD8,0xFF,0xE0,0x4A)` (any bytes after the first three) and `[Text.Encoding]::ASCII.GetBytes("RIFF....WEBPVP8 ")`.

- [ ] **2.1 PNG.** `curl -i -b jar.txt -X POST -H 'Content-Type: image/png' --data-binary @t.png $BASE/uploads` (PowerShell: `curl.exe -i -b jar.txt -X POST -H "Content-Type: image/png" --data-binary "@t.png" "$BASE/uploads"`). Expect `201` `{"status":"success","message":"Image uploaded","url":"/uploads/<uuid>.png","name":"<uuid>.png"}`. Note the name as `NAME`. The file exists in `backend/data/test/uploads/`.
- [ ] **2.2 JPEG, GIF, WebP.** Repeat with `image/jpeg` + `t.jpg` (name ends `.jpg`), `image/gif` + `t.gif` (`.gif`), `image/webp` + `t.webp` (`.webp`). Expect `201` each. (Never verified before.) For visual confirmation use real files in section 4.
- [ ] **2.3 Mismatch and rejects, all `415`.**
  - SVG as its own type: `-H 'Content-Type: image/svg+xml' --data-binary @t.svg` expect `415` `Upload a PNG, JPEG, GIF or WebP image as the raw request body`.
  - SVG pretending to be PNG: `-H 'Content-Type: image/png' --data-binary @t.svg` expect `415` `File content does not match an allowed image type`.
  - Fake PNG: `image/png` + `fake.png` expect `415` (same message).
  - PNG bytes declared as JPEG: `image/jpeg` + `t.png` expect `415`.
  - Empty body: `curl -i -b jar.txt -X POST -H 'Content-Type: image/png' --data-binary '' $BASE/uploads` expect `415`.
  - JSON body: `-H 'Content-Type: application/json' -d '{}'` expect `415`.
  No new file appears in the uploads folder for any of these.
- [ ] **2.4 Too large is 413.** `image/png` + `big.png` (6 MB) expect `413` `Image too large (max 5 MB)`.
- [ ] **2.5 Unauthenticated is 401.** Same PNG upload without `-b jar.txt` expect `401` `Not authenticated`. Also with `big.png` and no cookie: `401`, not 413.
- [ ] **2.6 Fetch headers.** `curl -I $ORIGIN/uploads/<NAME>` expect `200`, `Content-Type: image/png`, `Cache-Control: public, max-age=31536000, immutable`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'; img-src 'self'; sandbox`. No cookie needed (public).
- [ ] **2.7 Missing file is a JSON 404.** `curl -i $ORIGIN/uploads/nope.png` expect `404`, `application/json`, `{"status":"fail","message":"Not found"}` (not `index.html`, no filesystem path in the message). `curl -i $ORIGIN/uploads/` is also `404` (no directory listing).
- [ ] **2.8 Traversal attempt.** `curl -i --path-as-is "$ORIGIN/uploads/../data/test/blog.db"` and `curl -i "$ORIGIN/uploads/..%2Fblog.db"` and `curl -i "$ORIGIN/uploads/%2e%2e/blog.db"`. Expect `403` or `404` and never database bytes. (A `../blog.db` request returned 403 in the docs pass.) Fails (you get file content): stop and report immediately.
- [ ] **2.9 Method check.** `curl -i -X POST $ORIGIN/uploads/x.png` expect an error (405 was seen). Not a file write.

## 3. Frontend in the browser

Start both servers: backend (`npm run dev` in `backend/`, port 3000; restart it first to reset the rate limit) and frontend (`npm run dev` in `frontend/`, open `http://localhost:5173`). The app is always dark (the theme is fixed; there is no light mode toggle). Open DevTools (F12) and keep the Console and Network tabs visible. Any red console error during a step is a finding.

- [ ] **3.1 Home loads.** `/` shows the hero and a "Read Blogs" button leading to `/list`. Logged-out nav: Home, View Blogs, Categories (no Login since 2026-10-11, no Create Post, no Logout; see 3.1 below).
- [ ] **3.2 Login validation.** Go to `/login`. Submit empty: "Please enter a username." and "Password must be at least 6 characters long." Wrong password (6+ chars): "Invalid username or password." No hint which part was wrong.
- [ ] **3.3 Login success.** Correct credentials. Expect a redirect to `/list` and the nav changes to Home, View Blogs, Create Post, Categories, Logout. In DevTools, Application > Cookies > `http://localhost:5173`: cookie `token`, HttpOnly checked, SameSite Lax, Secure not checked. Application > Local Storage must hold no token or user. Network: the `login` response has no `token` in its body. Fails: [troubleshooting, "Login works but next request is 401"](operations.md#troubleshooting).
- [ ] **3.4 Reload keeps login.** Press F5 on `/list`. Still logged in (nav still shows Logout). Network shows `GET /api/v1/user/profile` with `200`. Open a new tab at `/list`: also logged in.
- [ ] **3.5 Create a category.** Categories > "Create Category" (`/create-category`). Submit empty: "Category name is required". Create "Projects". Expect to land on the category list with the new card showing "0 posts" and Edit and Delete buttons. Edit its description and save; confirm it changed.
- [ ] **3.6 Create a post.** Create Post (`/create-post`). Submit with the category empty: "All fields are required" (category is required on create). Fill Title "First post", content `# Hello` then a paragraph with **bold**, a list and a code block, choose the category, press "Create Post". Expect "Post created successfully! Redirecting..." then `/list` after about 1.5 seconds.
- [ ] **3.7 List card.** The card shows the title, `Projects | <date>` and an excerpt of the content with Markdown punctuation stripped (160 characters, then `...`), and "See More". Add a post whose content starts with an image and is long (200+ characters) to confirm the image is not in the excerpt and the excerpt is cut with `...` (image excerpts are checked again in section 4).
- [ ] **3.8 Post details and Markdown.** Click the card. `/posts/<id>`: title, `Projects | <date>`, content rendered (heading, bold, list, code block), not raw Markdown symbols. Category count on `/categories` now shows "1 posts" (the text is literally "N posts").
- [ ] **3.9 Edit a post.** Click Edit (`/edit-post/<id>`). The form is pre-filled including the category selected. Change the title and content, press "Update Post". Confirm the changes on the details page. Edit again, set the category select to **None**, save: the details header no longer shows a category and the list card shows only the date. Edit again, pick the category back.
- [ ] **3.10 Delete a post.** Details page > Delete > the "Confirm Delete" dialog > Cancel keeps the post; Delete removes it and goes to `/list`. The post is gone.
- [ ] **3.11 Delete a category keeps its posts.** Create a post in a throwaway category, then delete the category from `/categories` (confirm dialog). The post is still on `/list` and shows no category.
- [ ] **3.12 404 page.** Visit `/does-not-exist`. Expect "404" and "Page not found." with a "Back home" button that goes to `/`. Visit `/posts/99999`: expect an error line (`Error: ...`; the exact text, probably the axios 404 message, is unverified). Visit `/edit-post/99999` while logged in and watch the console (behavior unverified).
- [ ] **3.13 Logout clears it.** Click Logout. Expect a redirect to `/`, nav back to the public one (no Login link). Cookies: `token` gone (or expired). F5: still logged out. The server also revokes all tokens for the user (`token_version`); to confirm, replay a cookie copied before logout with `curl` and expect `401`.
- [ ] **3.14 Protected routes redirect when logged out.** While logged out visit each of `/create-post`, `/edit-post/1`, `/create-category`, `/edit-category/1`. Each should land on `/login` (no flash of the form). Public routes `/`, `/list`, `/categories`, `/posts/1` stay open.
- [ ] **3.15 Logged-out visitors see no controls.** Logged out: the post details page has no Edit or Delete buttons; `/categories` has no "Create Category" button and the cards have no Edit/Delete; the nav has no Create Post. The list and details pages still show all content.
- [ ] **3.16 Session ends on a 401.** Log in, then in DevTools delete the `token` cookie and click "Create Post" in the nav (a full page load). Expect to be sent to `/login`. Optionally: log in, delete the cookie, then press Delete in a dialog without reloading; the 401 interceptor should log you out (behavior from the code, unverified).
- [ ] **3.17 429 message on lockout.** Restart the backend first. On `/login` submit a wrong password (6+ characters) 11 times. Expect the message "Too many attempts. Try again later." from the 11th attempt on, and the correct password is also refused. Restart the backend and log in to confirm recovery.
- [ ] **3.18 Mobile width and nav.** DevTools device toolbar (Ctrl+Shift+M), width about 375 px. Expect the three-line menu icon (the desktop links are hidden), tapping it opens a top drawer with View Blogs, Categories (logged out; no Login item) or View Blogs, Create Post, Categories, Logout (logged in); the close (X) button works; the Logout button in the drawer logs out. The code marks the mobile nav "have to optimize", so note layout oddities rather than failing on them. Check the list is readable on narrow width: the grid uses a fixed column size, so cards may look cramped (unverified). Also test at about 900 px (the `md` breakpoint where the desktop nav appears).
- [ ] **3.19 Console is clean.** After the above, no red errors other than expected 401/404 requests. `npm run lint` is known to report about 42 errors; they are not runtime errors.

### 3.1 Logged-out read-only checks

Added 2026-10-11 for the public read-only frontend. The curl checks were run by a tester against a local backend with the built frontend (port 3999); the browser items were **not** run (no browser available), so they are unverified.

Browser checklist (unverified), logged out, with DevTools open:

- [ ] **R.1 No Login link on desktop.** The navbar shows Home, View Blogs, Categories only.
- [ ] **R.2 No Login item on mobile.** At about 375 px the drawer shows View Blogs and Categories only.
- [ ] **R.3 No link to `/login` anywhere.** Click through `/`, `/list`, `/categories`, a post: no link leads to `/login`. (Verified by code search: no other component links to it.)
- [ ] **R.4 `/login` still works when typed.** Open `/login` directly: the form appears; logging in works and the nav switches to the private one.
- [ ] **R.5 Protected pages redirect.** `/create-post` and the other admin routes still land on `/login` (see 3.14).
- [ ] **R.6 Categories page is read-only.** No Create Category button and no Edit/Delete on cards (see 3.15); logged in, they appear (`isAdmin` is now `Boolean(user)`).
- [ ] **R.7 robots.txt.** `/robots.txt` shows `User-agent: *` and `Disallow: /login` as plain text, not the app (check on the droplet too).

Curl checks (verified locally; each unauthenticated request returns `401`; `$PORT` is your server port):

```sh
for t in "POST api/v1/posts/create" "PUT api/v1/posts/1" "DELETE api/v1/posts/1" \
         "POST api/v1/category/create" "PUT api/v1/category/1" "DELETE api/v1/category/1" \
         "POST api/v1/uploads" "GET api/v1/user/profile"; do
  set -- $t
  printf '%s %s ' "$1" "$2"
  curl -s -o /dev/null -w '%{http_code}\n' -X "$1" -H 'Content-Type: application/json' -d '{}' "http://localhost:$PORT/$2"
done
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:$PORT/login          # 200, the SPA index.html
curl -s -i http://localhost:$PORT/robots.txt                                    # 200, text/plain
```

Expect `401` on every API line. `/login` and `/robots.txt` are served only when `public/` is built (the container, or a local `npm run build` copied into `backend/public`); with the Vite dev server `/robots.txt` comes from `frontend/public`.

## 4. Editor tests in the browser

Log in and open `/create-post`. Use a throwaway title and category. The preview and the published page use the same renderer.

Layout:

- [ ] **4.1 Wide layout.** At 1000 px or wider the text box and the preview are side by side, with no Write/Preview toggle. Typing updates the preview live.
- [ ] **4.2 Narrow layout.** Under 900 px a Write / Preview toggle appears. Preview hides the text box and, known quirk, the toolbar. Switch back to Write to see the toolbar again.

Toolbar (type `hello` first). For each button, test once with text selected and once with nothing selected. The caret/selection should be restored in the box after each click (focus stays in the box):

- [ ] **4.3 Bold.** Selected `hello` becomes `**hello**`; no selection inserts `**bold text**` with `bold text` selected.
- [ ] **4.4 Italic.** `*hello*`; none: `*italic text*`.
- [ ] **4.5 Inline code.** `` `hello` ``; none: `` `code` ``.
- [ ] **4.6 Link.** `[hello](url)` with `url` selected; none: `[link text](url)`. Type over `url` with `https://example.com` and check the preview link.
- [ ] **4.7 Code block.** Selected text is wrapped in a fenced block on its own lines (a leading newline is added if the selection is mid-line). None: a block containing `code`.
- [ ] **4.8 Line-prefix buttons (Heading, Bullet, Numbered, Quote).** Type three lines `a`, `b`, `c`. Select all three and click each button on a fresh copy: Heading `## a` ..., Bullet `- a`, Numbered `1. a` `2. b` `3. c`, Quote `> a` ... With the caret on one line and no selection, only that line changes. These do not toggle: clicking Heading twice gives `## ## a` (from the code; confirm).
- [ ] **4.9 Known trailing-newline quirk.** Put the caret at the start of line 1, press Shift+Down twice (the selection now ends right after the newline at the start of line 3), click Bullet list. Expected from the code (a documented known quirk): lines 1 and 2 get `- `, line 3 does not. Select through the last character of line 3 to include it.
- [ ] **4.10 Image button.** Click Insert image: a file picker (limited to PNG, JPEG, GIF, WebP, multiple selection) opens. Pick a real image. Expect `![<file name without extension>](/uploads/<uuid>.<ext>)` at the caret and the image in the preview.

Uploads:

- [ ] **4.11 Paste a screenshot.** Take a screenshot to the clipboard (Windows: Win+Shift+S), click in the text box, paste (Ctrl+V). The image uploads and `![image](/uploads/<uuid>.png)` appears (a pasted screenshot has no real name; the exact alt text, probably `image`, is unverified). Pasting plain text still works normally.
- [ ] **4.12 Drag and drop.** Drag an image file from Explorer over the text box: a dashed red outline appears; drop it. The image uploads and the Markdown is inserted. Drag several files at once: each is inserted.
- [ ] **4.13 Placeholder replaced.** To see the placeholder, set DevTools Network throttling to Slow 3G (or Offline then back) and upload a larger image. Expect `![Uploading <name>...]()` in the text, "Uploading image..." caption, then replacement by the final Markdown when done. Keep typing during the upload; your typing must not be lost when the placeholder is replaced.
- [ ] **4.14 Save disabled during upload.** While the upload from 4.13 is in flight, the "Create Post" button is disabled; it enables afterwards.
- [ ] **4.15 Failure: over 5 MB.** Pick a PNG larger than 5 MB. Expect a red alert "Image too large (max 5 MB)" (checked in the browser first), no placeholder left in the text, Save enabled again.
- [ ] **4.16 Failure: SVG.** Pick or drop an `.svg`. Expect the red alert "Only PNG, JPEG, GIF and WebP images can be uploaded", nothing inserted. Dropping a non-image file (a `.txt`) is ignored by the editor, and the browser may open it instead of the page (default browser behavior, unverified).
- [ ] **4.17 Failure: server error.** Stop the backend, upload an image. Expect an alert with an error message (`Network Error` or similar, unverified) and the placeholder removed. Restart the backend and log in again if needed.
- [ ] **4.18 Preview equals the post page.** Save a post with headings, a list, a quote, code, a link and an image. Open it on `/posts/<id>`: it should look the same as the preview, and the image should be no wider than the column and load.
- [ ] **4.19 Excerpt.** On `/list` the card excerpt for that post does not contain `![...](...)`, `#` or backticks.
- [ ] **4.20 Edit uses the same editor.** Edit the post, toolbar and uploads work the same, Save is "Update Post".

Markdown features (type each into the editor, check the preview, then the post page):

- [ ] **4.21 Table.**
  ```
  | a | b |
  |---|---|
  | 1 | 2 |
  ```
  Renders as a bordered table. Make a 12-column table: it scrolls horizontally inside the post instead of widening the page.
- [ ] **4.22 Strikethrough** `~~gone~~` shows struck through.
- [ ] **4.23 Task list** `- [ ] todo` and `- [x] done`: checkboxes with no bullets; you cannot toggle them (read-only).
- [ ] **4.24 Bare URL** `https://example.com` becomes a link.
- [ ] **4.25 Dark mode.** The app is always dark. Check text contrast, table borders (divider colour), code block background, and that a transparent PNG is readable on the dark background. There is no light mode to test.

Security probes (all must show as inert text or an inert element; no alert box may ever appear):

- [ ] **4.26 Raw HTML.** Type `<script>alert(1)</script>`, `<b>bold?</b>` and `<img src=x onerror=alert(1)>`. Expect the literal text shown (escaped), no bold, no broken-image icon, no alert, in the preview and on the post page.
- [ ] **4.27 `javascript:` link.** `[x](javascript:alert(1))`. Expect no alert on click. react-markdown 10 drops unsafe protocols; the link probably renders with an empty or no `href` (inspect it in DevTools; exact markup unverified).
- [ ] **4.28 Odd image URLs.** Each on its own line, none may run script:
  ```
  ![a](javascript:alert(1))
  ![b](data:text/html,<script>alert(1)</script>)
  ![c](https://example.invalid/x.png?"onerror="alert(1))
  ![d](/uploads/does-not-exist.png)
  ```
  Expect a broken or missing image at worst, never an alert. Inspect the `<img>` elements: no `onerror` attribute. Note `![c](...)` reaches out to `example.invalid` (fails to resolve).
- [ ] **4.29 Saved post stays inert.** Save the post containing the probes, reload `/posts/<id>` and `/list`. Still inert, no alert.

## 5. Docker

Stop the local backend first (port 3000). All commands from the repo root. The dev override publishes `127.0.0.1:3000` and resets the private `blog-net` network. Convenience alias:

bash: `alias dc='docker compose -f docker-compose.yml -f docker-compose.dev.yml'`
PowerShell: `function dc { docker compose -f docker-compose.yml -f docker-compose.dev.yml @args }`

Never run `docker compose down -v` in this section unless you mean to wipe the database, backups and uploads (`-v` deletes the `blog-data` volume).

- [ ] **5.1 Root env file.** `cp .env.example .env` and set `JWT_SECRET` to 32+ characters (`openssl rand -hex 32`, or any 32+ character string). Use the **root** `.env.example`, not `backend/.env.example` (its `DB_PATH` would override the container's; `NODE_ENV` in `.env` is ignored because the compose files set it). `git status` must not list `.env` (it is ignored).
- [ ] **5.2 Build and run.** `dc up -d --build`, then `dc ps`. Expect the `blog` service `Up`. The first build can take minutes. Fails with `node-gyp`/`find Python`: [troubleshooting](operations.md#troubleshooting) (the `--ignore-scripts` flag must be in the Dockerfile). Fails with network `caddy` not found: you left out the dev override.
- [ ] **5.3 Health.** `curl -s http://localhost:3000/health` expect `{"status":"ok"}`. Logs: `dc logs --tail=50 blog` shows `BlogMe Lite listening on port 3000`.
- [ ] **5.4 Non-root and permissions.**
  ```sh
  dc exec blog id                       # expect uid=1000(node) gid=1000(node)
  dc exec blog sh -c 'ls -ld /app/data'  # expect owner node
  dc exec blog sh -c 'echo $NODE_ENV $DB_PATH'   # with the dev override: development /app/data/blog.db (base compose file alone: production); not run, unverified
  ```
  On Git Bash for Windows, paths starting with `/` may be rewritten; wrap commands in `sh -c '...'` as shown. Fails (not `node`): [troubleshooting, "Cannot write DB"](operations.md#troubleshooting).
- [ ] **5.5 SPA and API.** `curl -i http://localhost:3000/` and `curl -i http://localhost:3000/posts/1` expect `200` `text/html`. `curl -i http://localhost:3000/api/v1/nope` expect JSON 404 (not HTML). `curl -s http://localhost:3000/api/v1/posts` expect `{"status":"success","posts":[]}`. Fails with JSON "Not found" on `/`: [troubleshooting, "/health is fine but the site shows JSON Not found"](operations.md#troubleshooting).
- [ ] **5.6 Admin via exec (interactive).** `dc exec -it blog node src/scripts/createAdmin.js` and answer the prompts (password 12+ characters; it is not echoed). Expect `Admin "<name>" created.` In Git Bash on Windows `-it` may complain "the input device is not a TTY"; use PowerShell, or prefix with `winpty` (unverified).
  Optional sample data for the browser checks (local container only, after the admin exists; rebuild with `--build` so the image includes the script): `dc exec blog node src/scripts/seed.js`. Verified in a throwaway container on 2026-10-11 (also `dc exec blog npm run seed`); not clicked through in a browser. Never on the droplet.
- [ ] **5.7 Login over curl in the container.** `curl -i -c cj.txt -H 'Content-Type: application/json' -d '{"username":"<name>","password":"<password>"}' http://localhost:3000/api/v1/user/login`. Expect `200` and the cookie `HttpOnly; SameSite=Lax; Max-Age=604800` **without `Secure`** (the dev override sets `NODE_ENV=development`; with the base compose file alone, `NODE_ENV=production` and the cookie has `Secure`). Not run, unverified. Create a category and a post with `-b cj.txt` (as in section 1; curl sends the Secure cookie to `http://localhost`, which it treats as trustworthy; if yours does not, use `https` via Caddy).
- [ ] **5.8 Deep link refresh in a browser (needs a working cookie, see 5.9).** Open `http://localhost:3000/posts/1`, press F5. The page must reload to the post, not a blank page or JSON 404. Also `http://localhost:3000/does-not-exist` shows the React 404 page.
- [ ] **5.9 Browser login on `http://localhost:3000`.** The cookie flag comes from `secure: !isDevLike()` in `backend/src/middleware/auth.js` (`Secure` unless `NODE_ENV` is `development` or `test`). `docker-compose.dev.yml` sets `NODE_ENV=development`, so with the dev override the cookie is not Secure and login over plain `http://localhost:3000` should work (not tried in a browser; unverified). Without the override, `docker-compose.yml` forces `NODE_ENV=production`, the cookie is `Secure`, and browsers refuse to store a Secure cookie from a plain `http://` page unless they treat the origin as secure. Chrome and Firefox generally treat `http://localhost` as a secure context and accept it; Safari and any other host name or IP (`http://127.0.0.1:3000`, `http://192.168.x.x:3000`) do not. This was never tried in a browser (unverified). Test it: log in on `http://localhost:3000/login`, then F5. If you stay logged in, the cookie is stored. If you are bounced back (login "succeeds" then everything acts logged out, and the cookie is missing in DevTools), the browser rejected it; that is not an app bug. Ways to test properly:
  1. Section 3 against the local dev server (`NODE_ENV=development`, no `Secure`): that is the functional test of the UI.
  2. HTTPS through Caddy on the droplet (section 6): the real production test.
  3. Adding `NODE_ENV=development` to the root `.env` no longer changes anything: the compose files set `NODE_ENV` explicitly and that wins over `env_file`.
- [ ] **5.10 Persistence across down and up.** Make sure a post and the admin exist. `dc down` (no `-v`!), then `dc up -d`. Expect the post list, the admin login and the old cookie to still work (`curl -s -b cj.txt http://localhost:3000/api/v1/user/profile` returns the user). `dc ps` shows the container recreated. Also test `dc restart blog` and `dc stop` then `dc start` (never run before). Fails (data gone): did you run `down -v`? See [operations.md](operations.md#start-stop-restart-update).
- [ ] **5.11 Backup file.**
  ```sh
  dc exec -T blog node src/scripts/backup.js
  dc exec blog sh -c 'ls -l /app/data/backups'
  ```
  Expect `Backup written: /app/data/backups/blog-<YYYYMMDD-HHMMSS>.db` and the file listed.
- [ ] **5.12 Copy out and verify.** `dc cp blog:/app/data/backups/<file> ./scratch.db` then from `backend/`:
  ```sh
  node -e "const D=require('better-sqlite3');const d=new D(process.argv[1],{readonly:true});console.log(d.prepare('select count(*) n from posts').get(), d.pragma('integrity_check'))" ../scratch.db
  ```
  Expect your post count and `[ { integrity_check: 'ok' } ]`. Delete `scratch.db` afterwards (it contains the admin hash; it is git-ignored via `*.db*` only inside `backend/`, so do not commit it from the root).
- [ ] **5.13 Backup pruning (never run).** Optional: run the backup script 16 times at different seconds (a loop with `sleep 1`), then `ls /app/data/backups` should show 14 files. Two backups within the same second collide on the file name, so keep the sleep.
- [ ] **5.14 Uploads in the container persist.** Upload a PNG with the cookie from 5.7: `curl -b cj.txt -X POST -H 'Content-Type: image/png' --data-binary @t.png http://localhost:3000/api/v1/uploads`, check `curl -I http://localhost:3000/uploads/<name>` (200, `nosniff`), `dc down`, `dc up -d`, fetch again: still 200. `dc exec blog sh -c 'ls -l /app/data/uploads'` shows the file owned by `node`.
- [ ] **5.15 Memory and disk.** `docker stats --no-stream` expect roughly 20 MiB of the 300 MiB limit idle (`mem_limit: 300m`); upload a few images and browse and check it stays well under. `dc exec blog sh -c 'du -sh /app/data /app/data/uploads /app/data/backups'`; `docker system df`.
- [ ] **5.16 Secrets not baked in.** `dc exec blog sh -c 'ls -a /app'` does not list `.env`. `dc exec blog sh -c 'env | grep JWT'` shows the secret (that is expected inside the container, do not paste it anywhere).
- [ ] **5.17 Stop.** `dc stop` when done (`dc down` is also fine; again no `-v`).

## 6. Droplet and Caddy acceptance tests (Phase 5, unverified)

Phase 5 has not started; nothing below was run. Do the setup first from [deploy.md](deploy.md). Replace `<domain>`.

- [ ] **6.1 First start.** On the droplet, `.env` has a 32+ character `JWT_SECRET`, `docker compose up -d --build` (use the base compose file, no dev override), `docker compose ps` shows Up. Then attach Caddy: `docker network connect blog-net <caddy-container>` (or external network in Caddy's compose); a 502 from Caddy usually means it is not on `blog-net` ([troubleshooting](operations.md#troubleshooting)). Fails with OOM during build: add swap or build elsewhere.
- [ ] **6.2 HTTPS loads.** `https://blog.<domain>` shows the site with a valid certificate (padlock). `curl -s https://blog.<domain>/health` returns `{"status":"ok"}`. `http://blog.<domain>` redirects to HTTPS (Caddy default; unverified). 502 means the container is down or off the Caddy network ([troubleshooting](operations.md#troubleshooting)).
- [ ] **6.3 Admin and login.** `docker compose exec -it blog node src/scripts/createAdmin.js`; log in at `/login` in a browser. This is the real test for the `Secure` cookie: DevTools shows `token` with Secure and HttpOnly, F5 keeps you logged in, Logout clears it.
- [ ] **6.4 Publish a post with an image.** Create a category and a post, paste a screenshot into the editor, save, open the post logged out (private window): the image loads from `https://blog.<domain>/uploads/<name>`; `curl -I` on it shows `nosniff`, the CSP and the long cache header.
- [ ] **6.5 Request body size limit.** With the Caddy snippet's `request_body { max_size 6MB }`: an upload of about 5.5 MB should reach the app and get the JSON 413 `Image too large (max 5 MB)`; one of 7 MB should be rejected by Caddy itself (a non-JSON 413; unverified). A valid 4 MB image goes through. Fails (Caddy does not start or reload): check the directive against your Caddy version.
- [ ] **6.6 Rate limit sees real IPs.** Fail the login 11 times from your own machine; you get 429. Then log in from a different network (phone data) and confirm you are **not** locked out (otherwise `TRUST_PROXY` is wrong and the app sees only Caddy's IP and everyone shares one counter; unverified).
- [ ] **6.7 Backup cron produced a file.** After the first scheduled run (or run the cron line by hand): `docker compose exec blog sh -c 'ls -l /app/data/backups'` shows a recent `blog-*.db`; the log file named in the cron line (`/var/log/blog-backup.log`) has `Backup written: ...` and no errors; your uploads copy exists wherever you configured it (check for the nested `uploads/uploads` layout mentioned in [deploy.md](deploy.md#nightly-backup-cron)).
- [ ] **6.8 Test restore on a scratch copy.** Follow [deploy.md](deploy.md#test-restore): copy the newest backup out, run the integrity check (post count and `ok`), start a throwaway server on port 3999 with `NODE_ENV=development DB_PATH=./scratch.db JWT_SECRET=change-me PORT=3999 node src/index.js` and `curl http://localhost:3999/api/v1/posts`. Then copy `uploads/` out, point a throwaway server at it with `UPLOAD_DIR`, and `curl -I http://localhost:3999/uploads/<name>` for a known image (expect 200 and `nosniff`). Do **not** restore into the live volume for this test. The live restore ([operations.md](operations.md#restore-unverified)) has never been run either.
- [ ] **6.9 Survives a reboot.** `sudo reboot`; the container returns by itself (`restart: unless-stopped`) and the site and data are intact.

## 7. Security spot checks

- [ ] **7.1 No secrets in any response.** With a logged-in jar, for each URL, count the matches (expect `0` every time):
  ```sh
  for u in user/profile posts posts/1 category category/1; do curl -s -b jar.txt $BASE/$u | grep -ci 'password\|hash\|jwt\|token'; done
  curl -s -c jar.txt -H 'Content-Type: application/json' -d '{"username":"admin","password":"change-me-12345"}' $BASE/user/login | grep -ci 'password\|hash\|token'
  ```
  A post whose title or content contains the word "token" would be a false hit. The login body must not contain a token; the token exists only in the `Set-Cookie` header.
- [ ] **7.2 Cookie is HttpOnly.** In the browser console on the site, `document.cookie` must not show `token`. DevTools shows the HttpOnly box ticked.
- [ ] **7.3 Nothing sensitive is tracked by git.** From the repo root:
  ```sh
  git status --short
  git check-ignore -v .env backend/.env backend/data/test/blog.db backend/data/test/uploads/x.png
  git ls-files | grep -E '(^|/)\.env$|\.db|data/uploads'
  ```
  `git status` must not list `.env`, a `.db` file or an `uploads` folder. `git check-ignore` should print a matching rule for all four paths (the first two come from `.gitignore` `.env`, the database and uploads from `backend/.gitignore`: `data` and `*.db*`). The last command should print nothing (`.env.example` files are fine and are not matched). If `check-ignore` prints nothing for a path, that path is NOT ignored; fix before committing. Also check a stray `scratch.db` or `backups-copy` folder you made in the repo root is not staged.
- [ ] **7.4 No secret values in committed examples.** `git grep -n "JWT_SECRET=" -- ':!docs'` shows only empty values or the word `change-me`-style placeholders, never a real secret.
- [ ] **7.5 Direct upload URL cannot run script.** Open `http://localhost:5173/uploads/<NAME>` (or `:3000`) in a browser: it shows the image only. In DevTools Network, the response has `nosniff` and the sandbox CSP. An upload that is not an image never gets stored (2.3), and SVG is rejected, so there is no uploaded file that can run script. Optional: rename a `.txt` to `.png` and upload it, expect 415.
- [ ] **7.6 Uploads need auth.** Repeat 2.5. Also confirm there is no register route: `curl -i -X POST -H 'Content-Type: application/json' -d '{"username":"x","password":"y"}' $BASE/user/register` expect `404`.
- [ ] **7.7 Login timing/enumeration.** Wrong user and wrong password return the identical 401 body (1.2).
- [ ] **7.8 Security headers and CSP in a browser (never verified).** Against the container (section 5) or the droplet, open the site with DevTools Console open and click through home, a post, login and the editor. Expect no `Content-Security-Policy` violation messages (the CSP allows `'self'` scripts, inline styles, and `https:`/`data:` images). `curl -I $BASE/../health` (or any app URL) shows `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` and no `X-Powered-By`. Through Caddy, also `Strict-Transport-Security`. If the CSP blocks something (for example an image from an `http://` URL or an embedded font), report the console text. See [security.md](security.md).

## 8. Results log

Copy this table into a note and fill it in. "Fail" rows: add the evidence listed in the next section.

| Step | Pass / Fail / Skipped | Notes (what you saw, version, browser) |
|---|---|---|
| 0.1 to 0.7 setup | | |
| 1.1 health | | |
| 1.2 generic 401 | | |
| 1.3 login and cookie flags | | |
| 1.4 to 1.6 415, profile, 401 on writes | | |
| 1.7 to 1.11 category and post CRUD, category rules | | |
| 1.12 to 1.16 bad ids, 415, 413, 404 JSON, SQL text | | |
| 1.17 to 1.20 delete, category delete keeps posts, logout | | |
| 1.21 restart keeps data | | |
| 1.22 rate limit 429 and reset | | |
| 2.1 to 2.2 uploads PNG JPEG GIF WebP | | |
| 2.3 to 2.5 rejects, 413, 401 | | |
| 2.6 to 2.9 headers, 404, traversal, method | | |
| 3.1 to 3.4 home, login, reload | | |
| 3.5 to 3.11 category and post flows | | |
| 3.12 to 3.15 404, logout, redirects, hidden controls | | |
| 3.16 to 3.17 session end, 429 message | | |
| 3.18 mobile | | |
| 4.1 to 4.9 layout, toolbar, quirk | | |
| 4.10 to 4.17 image button, paste, drop, failures, Save disabled | | |
| 4.18 to 4.25 preview, GFM, dark look | | |
| 4.26 to 4.29 XSS probes | | |
| 5.1 to 5.5 Docker build, non-root, SPA | | |
| 5.6 to 5.9 admin, cookie, Secure over http | | |
| 5.10 to 5.17 persistence, backup, uploads, memory | | |
| 6.x droplet (Phase 5) | | |
| 7.x security spot checks | | |

### When something fails, what to report back

Send, for the failing step number:

- What you did, what you expected (from this guide) and what happened, with the exact text on screen.
- Environment: OS, Node (`node -v`), browser and version, whether it was local dev, Docker with the dev override, or the droplet.
- For API steps: the full `curl -i` output (remove the cookie value and any password).
- For the browser: the DevTools Console errors (copy the text) and, in the Network tab, the failing request's URL, status, request headers (not the cookie value) and response body.
- Backend logs: local, the terminal running `npm run dev`; Docker, `docker compose logs --tail=200 blog` (add `-f docker-compose.yml -f docker-compose.dev.yml` as in section 5). Note 4xx responses are not logged; only unexpected 500s print a stack.
- For Docker or cron failures: `docker compose ps`, `docker stats --no-stream`, `df -h`.
- Never paste `.env`, `JWT_SECRET`, cookie values or passwords.

## Appendix

### Known limitations not worth testing

- Lint errors: `npm run lint` in `frontend/` reports about 42 errors (prop-types, unused `React` imports). The build does not depend on lint.
- Orphaned images are never deleted: editing or deleting a post leaves its images in `uploads/`. There is no cleanup tool (Phase 6 idea).
- Images are public by URL and keep EXIF data (such as GPS). Strip it before uploading photos.
- Logout revokes all of the user's tokens, but a password change does not; after a manual password reset, old cookies work until they expire (7 days), logout, or `JWT_SECRET` rotation.
- The rate limit is in memory (lost on restart), per client, plus a global cap of 100 failures per 15 minutes. Clients with a successful login in the last 24 hours are exempt from the global cap, but the exemption is lost on restart, so the owner can still be locked out after a restart during an attack.
- The login form requires 6+ characters client-side while the admin password minimum is 12; harmless.
- The mobile nav is marked "have to optimize" in the code; post cards use a fixed grid size.
- `docker compose down -v` deletes the database, backups and uploads together; backups live on the same volume as the database.
- No likes, comments, registration, OAuth, drafts, slugs, search or pagination (out of scope).

### Automated tests

Backend security tests exist: `cd backend && npm test` (17 tests, `node --test` with `supertest`; seen passing on 2026-10-11). See [development.md](development.md#tests). They do not replace the manual sections above. Phase 2's wider list is still not automated, so you can ask for these later:

- Login success and failure (generic 401), and the cookie flags.
- 401 on protected routes without the cookie.
- Post CRUD and category CRUD, with the response keys from the API contract.
- Non-numeric and unknown ids return 404.
- Deleting a category does not delete its posts (`category_id` becomes NULL).
- SQL injection strings in titles are stored as plain text.
- No response body contains `password_hash`.
- `updated_at` changes on edit (from the tester agent's list).
- Slug collisions (listed in `tester.md`, but slugs are not built in v1; this case does not apply yet).
- The upload cases of section 2 (magic bytes, SVG, size, auth, headers).

Already automated: 403 for non-admin writes, logout revocation, security headers, `Secure` cookie off in test and on in production, the 429 per-client/IPv6/global limits (with the known-good exemption), `TRUST_PROXY` parsing, `JWT_SECRET` checks, the `UPLOAD_DIR` guard (database and backups directories).
