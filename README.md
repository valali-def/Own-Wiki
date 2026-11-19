# mdwiki

Single-user wiki for Markdown. One password, no database: all pages are plain `.md` files in a folder.
Backup and export = copy the `data/` folder.

Looks like a small book shelf: **Shelves → Books → Chapters → Pages**, with a flat, square design
(sharp corners, light and dark theme).

## Getting started

1. In `docker-compose.yml`, change the password at `APP_PASSWORD`.
2. `mkdir -p data && sudo chown 1000:1000 data` (the container runs as user `node`, UID 1000).
3. `docker compose up -d --build`
4. Open `http://SERVER-IP:3000` in your browser and enter the password.

Without Docker (for testing, Node 18+ required):
`APP_PASSWORD=secret DATA_DIR=./data node server.js`

## Try the design without a server (demo)

Open **`demo/wiki-demo.html`** by double-clicking it. No server, no Node, no Docker needed.

- It is the real interface (same `index.html`, `style.css`, `app.js`), but talks to a small fake backend in memory.
- **Any password works** (only an empty field is rejected, so you can see the error message).
- It comes with sample shelves, books, chapters and pages. Everything you change is gone after a reload.
- After you change `public/style.css`, `public/index.html` or `public/app.js`, rebuild it:
  `node demo/build.js`

More details in **GUIDE.md**.

## Structure

```
server.js            Backend (Node standard library only, no npm packages)
public/index.html    User interface
public/app.js        Frontend logic (login, tree, editor, search, own dialogs)
public/style.css     Appearance (square design, light/dark switchable)
demo/build.js        Builds the single-file demo from the files in public/
demo/mock-api.js     Fake backend used only by the demo (replaces server.js)
demo/wiki-demo.html  Ready-made demo, open it directly in the browser
Dockerfile
docker-compose.yml
data/                your pages (created on startup, mounted as a volume)
data/assets/         uploaded images
```

`demo/` is only for development. It is not needed in the Docker image.

## Configuration (environment variables)

| Variable | Default | Meaning |
|---|---|---|
| `APP_PASSWORD` | (required) | The one and only password |
| `PORT` | 3000 | Port inside the container |
| `DATA_DIR` | `./data` (`/data` in the image) | Folder containing the pages |
| `COOKIE_SECURE` | false | Set to `true` as soon as HTTPS is in front (e.g. `tailscale serve`), otherwise login over HTTP won't work |

Sessions are kept in memory: after a container restart you have to log in again.

Continue with **GUIDE.md**.
