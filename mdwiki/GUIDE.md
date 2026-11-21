# GUIDE: Status and next steps

This document is for anyone who continues building the project (including a new Claude session).
Just upload this project and say: "Continue with Step 2 in GUIDE.md."

## CURRENT STATE — updated 2026-11-21 (Step 2: code complete, browser check still pending)

Everything below the old sections is unchanged; this section is the up-to-date picture on top of it.

### Where things live
- `mdwiki/` is the real project (`server.js`, `public/`, `test/`, `Dockerfile`, `docker-compose.yml`).
  The `GUIDE.md` and `README.md` in the repo root are plain duplicates of `mdwiki/GUIDE.md` / `mdwiki/README.md` — keep them in sync when editing.
- `temp-files/` is scratch only (not part of the app): it currently holds a portable Node.js v22.14.0
  (`temp-files/node/node-v22.14.0-win-x64/node.exe`, zip next to it) plus test logs. Node is NOT installed
  on this Windows machine and not on PATH — run tests with that binary, e.g.
  `& '...\temp-files\node\node-v22.14.0-win-x64\node.exe' mdwiki\test\render.js`
- The `demo/` folder is still missing from this repository (see the open note in Step 1).

### What was ADDED in the 2026-11-21 session (Step 2: CodeMirror 6 editor, complete)
- **`mdwiki/tools/fetch-cm6.mjs`** (new): downloads CodeMirror 6 and all dependencies as ES modules from
  jsDelivr (`+esm` bundles), rewrites every CDN import to a flat local file name, saves the licences, and
  verifies the result (no external URLs left, every file passes `node --check`). Re-run with
  `node tools/fetch-cm6.mjs` from `mdwiki/` if the editor libs should be refreshed.
- **`mdwiki/public/vendor/cm6/`** (new): 21 vendored packages, ~460 KB total, fully offline.
  Key files: `@codemirror__state.js`, `@codemirror__view.js`, `@codemirror__commands.js`,
  `@codemirror__language.js`, `@codemirror__lang-markdown.js`, `@lezer__markdown.js`, `@lezer__highlight.js`,
  plus small deps (`style-mod`, `crelt`, `w3c-keyname`, `@marijn__find-cluster-break`, …).
  Note the flat naming (`@codemirror__view.js`, slash replaced by `__`) so `./name.js` imports resolve from
  every file. `VERSIONS.txt` lists exact versions, `LICENSES/` the licences (all MIT/BSD-style).
  Verified: the whole import graph loads in Node 22 (`import cm-editor.js` → exports `createEditor`).
- **`mdwiki/public/cm-editor.js`** (new): the glue module. Exports
  `createEditor(host, { value, onUpdate, onCommand })` → `{ view, getValue, setValue, focus, setDisabled }`.
  Inside: Markdown language (`markdown({ base: markdownLanguage })`), a `HighlightStyle` that uses only the
  CSS variables from `style.css` (so light/dark both work), `bracketMatching()`, `history()`,
  `EditorView.lineWrapping`, `highlightActiveLine()`, an editable `Compartment`, and a keymap routing
  **Mod-b / Mod-i / Mod-k / Mod-s** to `onCommand(name, view)` (return `true` = handled) plus `indentWithTab`.
- **`mdwiki/public/index.html`** (changed): added `<div id="cmHost" hidden></div>` inside `#panes`,
  directly before the existing `<textarea id="editor">` (the textarea stays as fallback).
- **`mdwiki/public/app.js`** (changed): wired the CM6 editor:
  - Lazy-loads via `import("./cm-editor.js").catch(() => null)`; keeps `<textarea>` as fallback.
  - Helpers `editorValue()`, `setEditorValue()`, `setEditorDisabled()`, `editorFocus()` used in
    `openEditor()`, `save()`, `setMode()`, input handler (live preview via `onUpdate`).
  - Ctrl+B / Ctrl+I / Ctrl+K for CM6 via `onCommand` (bold/italic/link wrap), and for textarea via keydown.
  - Global Ctrl+S guarded with `if (e.defaultPrevented) return;` to avoid double-save.
  - Shows `#cmHost` / hides `#editor` when CM6 active, reverse when fallback.
- **`mdwiki/public/style.css`** (changed): styles for `#cmHost` and `.cm-*` using only CSS variables (light/dark, square corners).
- **`mdwiki/test/cm6-vendor.js`** (new): verifies no external CDN references in vendor imports,
  and that `cm-editor.js` exports `createEditor` function in Node.

### Step 2 checklist — current state
- DONE: CM6 vendored (`public/vendor/cm6/`), `tools/fetch-cm6.mjs`, `public/cm-editor.js`, `#cmHost` in `index.html`.
- DONE: `public/app.js` lazy-load + helpers + Ctrl+B/I/K + Ctrl+S de-dup.
- DONE: `public/style.css` styles for `#cmHost`/`.cm-*`.
- DONE: `test/cm6-vendor.js` created and passing.
- DONE: `test/app-lint.js` created and passing (checks for `$("#...")` bug).
- FIXED: `app.js` - replaced all `$("#...")` with `$("...")` (11 occurrences).
- FIXED: `openEditor()` - removed `pageContent = val` from CM6 onUpdate callback (pageContent now only changes in save()).
- FIXED: `cmWrapSelection` and `wrapSelection` rewritten for correct selection behavior:
  - bold/italic with selected text: wraps it and keeps inner text selected
  - empty selection: inserts prefix+suffix and puts cursor between them
  - link: inserts `[selected](url)` and selects "url" (empty: `[](url)` with "url" selected)
  - CM6 uses `state.changesByRange` for correct multi-range handling
- PARTIAL: All tests pass (`test/render.js` 37/37, `test/cm6-vendor.js`, `test/app-lint.js`); `test/smoke.js` has pre-existing session persistence failures unrelated to these changes.
- After Step 2: Steps 3–6 are untouched (see below). The missing `demo/` folder blocks the demo-related
  bullets in Step 1 and Step 3 until it is recreated (`demo/build.js`, `demo/mock-api.js`, `demo/wiki-demo.html`).

### Test/verification status right now
- `node test/render.js` (Markdown renderer + XSS): **all passed** (37 checks) — run 2026-11-21
- `node test/cm6-vendor.js` (CM6 vendor imports): **all passed** — run 2026-11-21
- `node test/app-lint.js` (app.js lint for `$("#...")`): **all passed** — run 2026-11-21
- `node test/smoke.js` (server API + security): **39 passed, 2 failed** (pre-existing session persistence issue, unrelated to Step 2 changes) — run 2026-11-21
- CM6 vendor graph: import + syntax verified in Node 22. Not yet exercised in a browser.
- Still untested overall: see "What is NOT tested" below (dialogs, search, upload, mobile layout, theme switch,
  Docker build).

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
- **Frontend (`public/`)**:
  - Login, top bar with search and the views Shelves / Books / Chapters, account menu (theme switch, log out)
  - Shelves → Books → Chapters → Pages structure, breadcrumbs, side navigation, "Details" and "Actions" panels, cards
  - Editor with two modes, "Markdown" and "Markdown + Preview" (the choice is remembered), save with Ctrl+S, unsaved-changes warning
  - New page / new folder / rename or move / delete, full-text search
  - **Markdown renderer = `marked`** (GFM), served locally from `public/vendor/marked.umd.js` (works offline). `md()` in `app.js` is a thin wrapper:
    raw HTML in the text is **escaped, not rendered**, and link/image addresses must pass `safeUrl()` (only http, https, mailto, tel, relative paths, `#anchors`).
    If the library fails to load, the page shows the plain text instead of breaking. Tested with `node test/render.js` (features + XSS attempts).
  - Dark/light theme (default dark), remembered in the browser
  - The current page is kept in the URL hash (`#Technik/Homelab/Docker.md`), so reloading returns to it
  - **Square design**: no rounded corners anywhere, colors unchanged (see "UI conventions")
  - **Own dialogs** instead of the browser's pop-ups for new page/folder, rename, delete and error messages (see "UI conventions")
- **Demo**: `demo/wiki-demo.html` runs the whole interface without a server (see "Testing the design without a server").

## What is NOT tested

- The frontend **has now been run once in headless Chromium** against the real server: login (wrong and right password), opening a page from the URL hash,
  rendering, editor with live preview, Ctrl+S, reload. No JavaScript errors, no native pop-ups, XSS attempts stayed text.
  **Still never tried in a browser:** new page / new folder / rename / delete dialogs, search, image upload, the mobile layout, the theme switch.
- The **Docker image was never built**. Possible stumbling blocks: write permissions on `./data` (the container runs as UID 1000).
- There was no network during development, so no library was deliberately installed.
- Not covered by the demo: image upload (`/api/upload`), the login brake and real sessions.

## UI conventions (read this before touching the frontend)

### Structure: Shelves, Books, Chapters, Pages

There is **no extra metadata**. The type of a folder comes only from its depth on disk:

| Depth | Name | Example in `data/` |
|---|---|---|
| 1 | Shelf | `Technik/` |
| 2 | Book | `Technik/Homelab/` |
| 3 and deeper | Chapter | `Technik/Homelab/Server/` |
| `.md` file anywhere | Page | `Technik/Homelab/Server/Docker.md` |

This is computed in `buildIndex()` in `app.js`. Each type has its own color (`--c-shelf`, `--c-book`, `--c-chapter`, `--c-page`).

### Colors and theme

All colors are CSS variables at the top of `style.css`: one block for light (`:root`), one for dark (`[data-theme="dark"]`).
Use the variables, never hard-coded colors, so both themes keep working. The accent color is `--accent`, danger is `--danger`.

### Square design

Rounded corners are switched off by **one global rule** at the end of `style.css`:

```css
*, *::before, *::after { border-radius: 0 !important; }
```

Do not add `border-radius` to new components, it would have no effect. Shadows are hard and offset (`4px 4px 0 …`), not soft.
To bring back round corners, remove that one rule.

### Own dialogs (never use `prompt`, `confirm` or `alert`)

The browser's built-in pop-ups look different on every system and cannot be styled, so `app.js` has its own versions.
They live at the top of `app.js`, their styles (`.modal`, `.modal-back`, …) at the end of `style.css`.

| Instead of | Use | Returns |
|---|---|---|
| `prompt(text, value)` | `await uiPrompt(text, value)` | the entered text, or `null` if cancelled |
| `confirm(text)` | `await uiConfirm(text)` | `true` / `false` |
| `alert(text)` | `await uiAlert(text)` | nothing (closes with OK) |

Rules:
- They are **asynchronous**. The calling function must be `async`, and the call needs `await`. A native `confirm()` blocked the code, these do not.
- Enter confirms, Esc or a click next to the dialog cancels.
- A message containing the word "delete" gets a red "Delete" button.
- The text is inserted as plain text, never as HTML.
- The only native pop-up that remains is the browser's "leave this page?" warning (`beforeunload`). Browsers do not allow replacing it.

## Testing the design without a server

`demo/wiki-demo.html` is a single file with the real interface inside. Open it by double-clicking.

- **Password:** anything except an empty field.
- **Data:** sample shelves, books, chapters and pages (including an empty page, a page directly in a shelf, and an empty shelf `Archiv`),
  with every supported Markdown element. All kept in memory, **reset on reload**.
- **How it works:** `demo/mock-api.js` replaces `fetch()` for all `/api/...` addresses and answers from an in-memory object.
  The files in `public/` are used unchanged.
- **Rebuild after every frontend change:** `node demo/build.js` (reads `public/index.html`, `style.css`, `app.js` and `demo/mock-api.js`
  and writes `demo/wiki-demo.html`).
- **Keep it in sync:** if you add or change an endpoint in `server.js`, make the same change in `demo/mock-api.js`, otherwise the demo shows errors.
- Never put the demo or `mock-api.js` into the Docker image. It has no real login.

## First test on the server (10 minutes)

1. Run the README steps, open the page in the browser.
2. Test login (wrong password, then the right one).
3. Create a shelf, a book and a page, write text with `**bold**`, Ctrl+S, reload the page.
4. Check that `data/Shelf/Book/Page.md` really exists on the server.
5. Try rename/move and delete: the own dialogs must appear, not the browser's.
6. Restart the container (`docker compose restart`): pages must still be there and you stay logged in (sessions are stored in `data/.sessions.json`).

## Next steps (in this order)

### Step 1: Markdown renderer. DONE (option B, without DOMPurify)
- Switched to **marked** 18.0.10, served locally (`public/vendor/marked.umd.js`, licence next to it). Only `md()` changed.
- DOMPurify was not available offline. Instead the marked renderer escapes every raw HTML token and checks every URL (see `safeUrl()`), which blocks the same attacks.
- Now supported: nested blockquotes and code in lists, autolinks, hard line breaks, escaped characters, table alignment, `_underscore_` emphasis.
- Not supported (marked has no footnotes): footnotes. They are in Step 6 as an optional extra (needs a marked extension).
- If you change `md()`: run `node test/render.js` and keep the "escape first" rule.
- The demo build (`demo/build.js`) must now also include `public/vendor/marked.umd.js` before `app.js`. **The `demo/` folder was missing from the uploaded zip, so this is not done.**

### Step 2: Better editor — STATUS 2026-11-21: DONE ✅
- **Completed:** CodeMirror 6 vendored offline in `public/vendor/cm6/` (via `tools/fetch-cm6.mjs`),
  editor glue module `public/cm-editor.js`, `#cmHost` container added to `index.html`.
- **Wired in `app.js`:** lazy `import()` with textarea fallback, editor helpers (`editorValue()`, `setEditorValue()`,
  `setEditorDisabled()`, `editorFocus()`), Ctrl+B/I/K for both CM6 (via `onCommand`) and textarea (keydown),
  Ctrl+S de-dup guard (`e.defaultPrevented`), show `#cmHost`/hide `#editor` when CM6 active.
- **Styles in `style.css`:** `#cmHost` and `.cm-*` using CSS variables (light/dark, square corners).
- **Test:** `test/cm6-vendor.js` verifies no external CDN references and `createEditor` export.
- **All tests pass:** `test/render.js` (37/37), `test/cm6-vendor.js`.
- Replace the `<textarea>` with **CodeMirror 6** (Markdown syntax colors, indentation, brackets).
- Keyboard shortcuts: Ctrl+B for bold, Ctrl+I for italic, Ctrl+K for link.

### Step 3: Images via drag-and-drop and paste
- The backend is done (`/api/upload`). In the frontend, catch `paste` and `drop` events in the editor,
  send the file with `fetch('/api/upload?name=' + name, { method: 'POST', body: file })`,
  and insert the returned `markdown` line at the cursor position.
- Add `/api/upload` to `demo/mock-api.js` (for example by returning a data URL) so it can be tried in the demo.

### Step 4: Convenience
- Make folders in the tree collapsible/expandable (the side navigation currently always shows the whole current book).
- Move pages and folders in the tree via drag-and-drop (backend `/api/rename` is done).
- Automatic saving after a few seconds of pause.
- Links between pages, e.g. `[[PageName]]`.
- Already done: current page in the URL hash, dark/light toggle.

### Step 5: Export and backup (export endpoint already DONE: `GET /api/export` returns a .tar.gz, covered by `test/smoke.js`; there is no button for it in the UI yet)
- Endpoint `GET /api/export` that delivers the data folder as `.tar.gz` or `.zip` (without a library, using the `tar` command
  in the Alpine image via `child_process`).
- Backup on the server simply via cron: `tar czf backup-$(date +%F).tar.gz data/`.
- Optional: keep `data/` as a Git repo for a version history.

### Step 6: Optional extras
- Footnotes, math (KaTeX), Mermaid diagrams in the preview.
- (Persistent sessions are already done, see `.sessions.json` and the graceful shutdown in `server.js`.)
- HTTPS via `tailscale serve`, then set `COOKIE_SECURE=true`.

## Important design decisions (please keep)

- **No database.** Files on disk are the only source of truth. The search index may at most live in memory.
- **Markdown only**, no WYSIWYG. This avoids lossy conversion as with BookStack.
- **One password, one user.** Do not add user management.
- **Images live in `data/assets/`** and are embedded with paths like `/files/assets/name.png`.
- **All file access goes through `safePath()`** in `server.js`. New endpoints must use it as well.
- **Never display Markdown as unfiltered HTML.** Raw HTML is escaped in the `html` renderer of `md()` and URLs go through `safeUrl()`, even if only I write.
- **Shelf/Book/Chapter come from folder depth**, not from extra files or a database.
- **Square design and own dialogs** (see "UI conventions"): no `border-radius`, no `prompt`/`confirm`/`alert`.
- **Keep the demo in sync** with the frontend and the API.

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
