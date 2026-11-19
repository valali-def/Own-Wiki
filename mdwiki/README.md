# mdwiki

Single-user wiki for Markdown. One password, no database: all pages are plain `.md` files in a folder.
Backup and export = copy the `data/` folder.

## Getting started

1. In `docker-compose.yml`, change the password at `APP_PASSWORD`.
2. `mkdir -p data && sudo chown 1000:1000 data` (the container runs as user `node`, UID 1000).
3. `docker compose up -d --build`
4. Open `http://SERVER-IP:3000` in your browser and enter the password.

Without Docker (for testing, Node 18+ required):
`APP_PASSWORD=secret DATA_DIR=./data node server.js`

## Structure

```
server.js          Backend (Node standard library only, no npm packages)
public/index.html  User interface
public/app.js      Frontend logic (login, tree, editor, search)
public/style.css   Appearance (light/dark automatic)
Dockerfile
docker-compose.yml
data/              your pages (created on startup, mounted as a volume)
data/assets/       uploaded images
```

## Configuration (environment variables)

| Variable | Default | Meaning |
|---|---|---|
| `APP_PASSWORD` | (required) | The one and only password |
| `PORT` | 3000 | Port inside the container |
| `DATA_DIR` | `./data` (`/data` in the image) | Folder containing the pages |
| `COOKIE_SECURE` | false | Set to `true` as soon as HTTPS is in front (e.g. `tailscale serve`), otherwise login over HTTP won't work |

Sessions are kept in memory: after a container restart you have to log in again.

Continue with **GUIDE.md**.
