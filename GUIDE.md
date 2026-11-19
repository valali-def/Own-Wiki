# GUIDE: Stand und nächste Schritte

Dieses Dokument ist für alle, die das Projekt weiterbauen (auch für eine neue Claude-Sitzung).
Einfach dieses Projekt hochladen und sagen: "Mach bei Schritt 1 in GUIDE.md weiter."

## Ziel

Ähnlich wie BookStack, aber: nur ich als Nutzer, nur Markdown (GitHub Flavored Markdown), keine Datenbank,
Dateien auf der Platte. Zugriff nur im Heimnetz und über Tailscale, deshalb kein eigenes HTTPS nötig.

## Was fertig ist

- **Backend (`server.js`)**, ohne Abhängigkeiten, die Logik wurde mit curl getestet:
  - Passwort-Login (`POST /api/login`), Session-Cookie (HttpOnly, SameSite=Strict), Bremse bei Fehlversuchen (1 s, 2 s, 4 s … max. 30 s, global)
  - Seiten lesen/schreiben (`GET/PUT /api/page`), Schreiben atomar (Temp-Datei + rename)
  - Ordner anlegen, umbenennen/verschieben, löschen
  - Baum (`GET /api/tree`), Volltextsuche (`GET /api/search?q=`, einfacher Datei-Scan, reicht für private Mengen)
  - Bild-Upload (`POST /api/upload?name=x.png`, Rohdaten im Body) nach `data/assets/`, ausgeliefert unter `/files/assets/...`
  - Schutz gegen Pfad-Tricks (`..`, Punkt-Dateien), nur `.md`-Seiten, Upload nur für bestimmte Bildtypen und PDF
- **Docker**: `Dockerfile` und `docker-compose.yml` (Volume `./data:/data`).
- **Frontend (`public/`)**: Login, Ordnerbaum, einfacher Editor (Textfeld), Speichern mit Strg+S, Neu/Umbenennen/Löschen, Suche.

## Was NICHT getestet ist

- Das **Frontend wurde nur auf Syntaxfehler geprüft**, nie in einem Browser geöffnet. Erwartet kleine Fehler, zuerst ausprobieren.
- Das **Docker-Image wurde nie gebaut**. Mögliche Stolpersteine: Schreibrechte auf `./data` (Container läuft als UID 1000).
- Es gab bei der Entwicklung kein Netzwerk, deshalb wurde bewusst keine Bibliothek installiert.

## Erster Test auf dem Server (10 Minuten)

1. README-Schritte ausführen, Seite im Browser öffnen.
2. Login testen (falsches Passwort, dann richtiges).
3. Ordner und Seite anlegen, Text mit `**fett**` schreiben, Strg+S, Seite neu laden.
4. Prüfen, dass `data/Ordner/Seite.md` auf dem Server wirklich existiert.
5. Container neu starten (`docker compose restart`): Seiten müssen noch da sein, Login wird neu verlangt.

## Nächste Schritte (in dieser Reihenfolge)

### Schritt 1: Live-Vorschau mit GFM (wichtigster Punkt)
- Bibliothek zum Rendern: **marked** (oder markdown-it) plus **DOMPurify** zum Bereinigen des HTML.
- Dateien werden **lokal ausgeliefert**, nicht von einem CDN, damit es offline im Heimnetz geht: im Dockerfile
  `npm install marked dompurify` bzw. die fertigen Browser-Bundles nach `public/vendor/` kopieren und in `index.html` einbinden.
- In `app.js` bei `input` im Editor `preview.innerHTML = DOMPurify.sanitize(marked.parse(text, { gfm: true }))` setzen,
  `#preview` sichtbar machen (steht bereits als versteckter Platzhalter in `index.html`).
- Tabellen, Aufgabenlisten, Durchgestrichen sind in `marked` mit `gfm: true` dabei.
- Optional: Umschalter "Nur Editor / Geteilt / Nur Vorschau".

### Schritt 2: Besserer Editor
- Das `<textarea>` durch **CodeMirror 6** ersetzen (Markdown-Syntaxfarben, Einrückung, Klammern).
- Tastenkürzel: Strg+B für fett, Strg+I für kursiv, Strg+K für Link.

### Schritt 3: Bilder per Drag-and-drop und Einfügen
- Das Backend ist fertig (`/api/upload`). Im Frontend `paste`- und `drop`-Ereignisse im Editor abfangen,
  Datei per `fetch('/api/upload?name=' + name, { method: 'POST', body: file })` senden,
  die zurückgegebene Zeile `markdown` an der Cursorposition einfügen.

### Schritt 4: Komfort
- Ordner im Baum ein-/ausklappbar machen, aktuelle Seite im URL-Hash merken (`#Linux/Docker.md`).
- Seiten und Ordner per Drag-and-drop im Baum verschieben (Backend `/api/rename` ist fertig).
- Automatisches Speichern nach ein paar Sekunden Pause.
- Links zwischen Seiten, z. B. `[[Seitenname]]`.
- Dark/Light ist per CSS schon automatisch, optional ein Schalter.

### Schritt 5: Export und Backup
- Endpunkt `GET /api/export`, der den Datenordner als `.tar.gz` oder `.zip` liefert (ohne Bibliothek mit dem `tar`-Befehl
  im Alpine-Image über `child_process`).
- Backup auf dem Server einfach per Cron: `tar czf backup-$(date +%F).tar.gz data/`.
- Optional: `data/` als Git-Repo führen für eine Versionshistorie.

### Schritt 6: Optionale Extras
- Fußnoten, Mathe (KaTeX), Mermaid-Diagramme in der Vorschau.
- Persistente Sessions (Tokens in einer Datei unter `data/.sessions.json` speichern), damit ein Neustart nicht abmeldet.
- HTTPS über `tailscale serve`, danach `COOKIE_SECURE=true` setzen.

## Wichtige Entwurfsentscheidungen (bitte beibehalten)

- **Keine Datenbank.** Dateien auf der Platte sind die einzige Wahrheit. Der Suchindex darf höchstens im Speicher liegen.
- **Nur Markdown**, kein WYSIWYG. So gibt es keine verlustbehaftete Umwandlung wie bei BookStack.
- **Ein Passwort, ein Nutzer.** Keine Benutzerverwaltung einbauen.
- **Bilder liegen in `data/assets/`** und werden mit Pfaden wie `/files/assets/name.png` eingebunden.
- **Alle Dateizugriffe laufen über `safePath()`** in `server.js`. Neue Endpunkte müssen es ebenfalls nutzen.
- **Markdown nie ungefiltert als HTML anzeigen** (DOMPurify), auch wenn nur ich schreibe.

## API-Kurzreferenz

| Methode | Pfad | Zweck |
|---|---|---|
| POST | `/api/login` | `{password}` |
| POST | `/api/logout` | Abmelden |
| GET | `/api/session` | prüft, ob eingeloggt |
| GET | `/api/tree` | Baum aus Ordnern und Seiten |
| GET | `/api/page?path=A/B.md` | Seite lesen |
| PUT | `/api/page` | `{path, content}` speichern/anlegen |
| POST | `/api/folder` | `{path}` Ordner anlegen |
| POST | `/api/rename` | `{from, to}` umbenennen/verschieben |
| DELETE | `/api/item?path=` | Seite oder Ordner löschen |
| GET | `/api/search?q=` | Volltextsuche |
| POST | `/api/upload?name=x.png` | Bild hochladen (Rohdaten im Body) |
| GET | `/files/assets/x.png` | Datei ausliefern (nie `.md`) |
