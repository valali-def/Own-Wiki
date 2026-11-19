# mdwiki

Einzelnutzer-Wiki für Markdown. Ein Passwort, keine Datenbank: Alle Seiten sind normale `.md`-Dateien in einem Ordner.
Backup und Export = den Ordner `data/` kopieren.

## Starten

1. In `docker-compose.yml` das Passwort bei `APP_PASSWORD` ändern.
2. `mkdir -p data && sudo chown 1000:1000 data` (der Container läuft als Benutzer `node`, UID 1000).
3. `docker compose up -d --build`
4. Im Browser `http://SERVER-IP:3000` öffnen und Passwort eingeben.

Ohne Docker (zum Testen, Node 18+ nötig):
`APP_PASSWORD=geheim DATA_DIR=./data node server.js`

## Aufbau

```
server.js          Backend (nur Node-Standardbibliothek, keine npm-Pakete)
public/index.html  Oberfläche
public/app.js      Frontend-Logik (Login, Baum, Editor, Suche)
public/style.css   Aussehen (Hell/Dunkel automatisch)
Dockerfile
docker-compose.yml
data/              deine Seiten (wird beim Start angelegt, per Volume eingebunden)
data/assets/       hochgeladene Bilder
```

## Konfiguration (Umgebungsvariablen)

| Variable | Standard | Bedeutung |
|---|---|---|
| `APP_PASSWORD` | (Pflicht) | Das einzige Passwort |
| `PORT` | 3000 | Port im Container |
| `DATA_DIR` | `./data` (im Image `/data`) | Ordner mit den Seiten |
| `COOKIE_SECURE` | false | Auf `true` setzen, sobald HTTPS davor ist (z. B. `tailscale serve`), sonst klappt der Login über HTTP nicht |

Sitzungen liegen im Speicher: Nach einem Neustart des Containers musst du dich neu anmelden.

Weiter geht es mit **GUIDE.md**.
