# GUIDE: Status and next steps

This document is for anyone who continues building the project (including a new Claude session).
Just upload this project and say: "Continue with Step 1 in GUIDE.md."

## Goal

Similar to BookStack, but: just me as the user, Markdown only (GitHub Flavored Markdown), no database,
files on disk. Access only on the home network and via Tailscale, so no HTTPS of its own is needed.

## What is done

- **Backend (`server.js`)**, no dependencies, logic tested with curl:
  - Password login (`POST /api/login`), session cookie (HttpOnly, SameSite=Strict), brake on failed attempts (1 s, 2 s, 4 s … max. 30 s, global)
  - Read/write pages (`GET/PUT /api/page`), atomic writes (temp file + rename)
  - Create, rename/move and delete folders
  - Tree (`GET /api/tree`), full-text search (`GET /api/search?q=`, simple file scan, enough for private amounts of data)
  - Image upload (`POST /api/upload?name=x.png`, raw data in the body) to `data/assets/`, served at `/files/assets/...`
  - Protection against path tricks (`..`, dotfiles), `.md` pages only, uploads only for certain image types and PDF
- **Docker**: `Dockerfile` and `docker-compose.yml` (volume `./data:/data`).
- **Frontend (`public/`)**: login, folder tree, simple editor (text area), save with Ctrl+S, new/rename/delete, search.

## What is NOT tested

- The **frontend was only checked for syntax errors**, never opened in a browser. Expect small bugs, try it out first.
- The **Docker image was never built**. Possible stumbling blocks: write permissions on `./data` (the container runs as UID 1000).
- There was no network during development, so no library was deliberately installed.

## First test on the server (10 minutes)

1. Run the README steps, open the page in the browser.
2. Test login (wrong password, then the right one).
3. Create a folder and a page, write text with `**bold**`, Ctrl+S, reload the page.
4. Check that `data/Folder/Page.md` really exists on the server.
5. Restart the container (`docker compose restart`): pages must still be there, login is required again.

## Next steps (in this order)

### Step 1: Live preview with GFM (most important item)
- Library for rendering: **marked** (or markdown-it) plus **DOMPurify** to sanitize the HTML.
- Files are served **locally**, not from a CDN, so it works offline on the home network: in the Dockerfile
  `npm install marked dompurify`, or copy the ready-made browser bundles to `public/vendor/` and include them in `index.html`.
- In `app.js`, on `input` in the editor, set `preview.innerHTML = DOMPurify.sanitize(marked.parse(text, { gfm: true }))`
  and make `#preview` visible (it already exists as a hidden placeholder in `index.html`).
- Tables, task lists and strikethrough are included in `marked` with `gfm: true`.
- Optional: toggle "Editor only / Split / Preview only".

### Step 2: Better editor
- Replace the `<textarea>` with **CodeMirror 6** (Markdown syntax colors, indentation, brackets).
- Keyboard shortcuts: Ctrl+B for bold, Ctrl+I for italic, Ctrl+K for link.

### Step 3: Images via drag-and-drop and paste
- The backend is done (`/api/upload`). In the frontend, catch `paste` and `drop` events in the editor,
  send the file with `fetch('/api/upload?name=' + name, { method: 'POST', body: file })`,
  and insert the returned `markdown` line at the cursor position.

### Step 4: Convenience
- Make folders in the tree collapsible/expandable, remember the current page in the URL hash (`#Linux/Docker.md`).
- Move pages and folders in the tree via drag-and-drop (backend `/api/rename` is done).
- Automatic saving after a few seconds of pause.
- Links between pages, e.g. `[[PageName]]`.
- Dark/light is already automatic via CSS, optionally add a toggle.

### Step 5: Export and backup
- Endpoint `GET /api/export` that delivers the data folder as `.tar.gz` or `.zip` (without a library, using the `tar` command
  in the Alpine image via `child_process`).
- Backup on the server simply via cron: `tar czf backup-$(date +%F).tar.gz data/`.
- Optional: keep `data/` as a Git repo for a version history.

### Step 6: Optional extras
- Footnotes, math (KaTeX), Mermaid diagrams in the preview.
- Persistent sessions (store tokens in a file under `data/.sessions.json`) so that a restart doesn't log you out.
- HTTPS via `tailscale serve`, then set `COOKIE_SECURE=true`.

## Important design decisions (please keep)

- **No database.** Files on disk are the only source of truth. The search index may at most live in memory.
- **Markdown only**, no WYSIWYG. This avoids lossy conversion as with BookStack.
- **One password, one user.** Do not add user management.
- **Images live in `data/assets/`** and are embedded with paths like `/files/assets/name.png`.
- **All file access goes through `safePath()`** in `server.js`. New endpoints must use it as well.
- **Never display Markdown as unfiltered HTML** (DOMPurify), even if only I write.

## API quick reference

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/login` | `{password}` |
| POST | `/api/logout` | Log out |
| GET | `/api/session` | checks whether logged in |
| GET | `/api/tree` | Tree of folders and pages |
| GET | `/api/page?path=A/B.md` | Read page |
| PUT | `/api/page` | `{path, content}` save/create |
| POST | `/api/folder` | `{path}` create folder |
| POST | `/api/rename` | `{from, to}` rename/move |
| DELETE | `/api/item?path=` | Delete page or folder |
| GET | `/api/search?q=` | Full-text search |
| POST | `/api/upload?name=x.png` | Upload image (raw data in the body) |
| GET | `/files/assets/x.png` | Serve file (never `.md`) |
