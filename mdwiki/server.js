'use strict';
// mdwiki - single-user Markdown wiki, no dependencies, data stored as files.
const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const PORT = parseInt(process.env.PORT || '3000', 10);
const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');
const PASSWORD = process.env.APP_PASSWORD || '';
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true'; // only true if HTTPS is in front
const SESSION_MS = 30 * 24 * 3600 * 1000;
const MAX_UPLOAD = 20 * 1024 * 1024;
const PUBLIC_DIR = path.join(__dirname, 'public');

if (!PASSWORD) { console.error('APP_PASSWORD is not set. Aborting.'); process.exit(1); }
fs.mkdirSync(DATA_DIR, { recursive: true });

// ---------- Auth ----------
// Sessions survive restarts: stored as SHA-256 hashes of the token in DATA_DIR/.sessions.json (dotfile, hidden from the wiki).
const SESSION_FILE = path.join(DATA_DIR, '.sessions.json');
const sessions = new Map(); // sha256(token) hex -> expiry time
const sha = s => crypto.createHash('sha256').update(s).digest();
const tokenKey = t => sha(String(t)).toString('hex');
try {
  const saved = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
  for (const [k, exp] of Object.entries(saved)) if (typeof exp === 'number' && exp > Date.now()) sessions.set(k, exp);
} catch { /* no file yet or unreadable: start with no sessions */ }
let saveTimer = null;
function saveSessions() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    for (const [k, exp] of sessions) if (exp < Date.now()) sessions.delete(k);
    const tmp = SESSION_FILE + '.tmp-' + process.pid;
    fsp.writeFile(tmp, JSON.stringify(Object.fromEntries(sessions)), { mode: 0o600 })
      .then(() => fsp.rename(tmp, SESSION_FILE))
      .catch(e => console.error('Could not save sessions:', e.message));
  }, 200);
}
const passwordOk = p => crypto.timingSafeEqual(sha(String(p)), sha(PASSWORD));

let failures = 0, lockedUntil = 0; // simple global brake against guessing
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(c => {
    const i = c.indexOf('=');
    if (i > 0) { const v = c.slice(i + 1).trim(); try { out[c.slice(0, i).trim()] = decodeURIComponent(v); } catch { out[c.slice(0, i).trim()] = v; } }
  });
  return out;
}
function isAuthed(req) {
  const t = parseCookies(req).sid;
  const k = t && tokenKey(t);
  const exp = k && sessions.get(k);
  if (!exp) return false;
  if (exp < Date.now()) { sessions.delete(k); saveSessions(); return false; }
  return true;
}

// ---------- Paths ----------
// Safely converts a wiki path ("Folder/Page.md") into a file path.
function safePath(rel) {
  if (typeof rel !== 'string' || rel.includes('\0')) throw httpErr(400, 'Invalid path');
  const parts = rel.split('/').filter(Boolean);
  if (parts.some(p => p === '.' || p === '..' || p.startsWith('.'))) throw httpErr(400, 'Invalid path');
  const abs = path.resolve(DATA_DIR, ...parts);
  if (abs !== DATA_DIR && !abs.startsWith(DATA_DIR + path.sep)) throw httpErr(400, 'Invalid path');
  return abs;
}
const dec = s => { try { return decodeURIComponent(s); } catch { throw httpErr(400, 'Bad URL'); } };
function httpErr(status, msg) { const e = new Error(msg); e.status = status; return e; }
const requireMd = rel => { if (!/\.md$/i.test(rel)) throw httpErr(400, 'Pages must end in .md'); };

// ---------- Files ----------
async function buildTree(dir, rel = '') {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const nodes = [];
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) {
      if (e.name === 'assets') continue; // do not show images in the tree
      nodes.push({ type: 'folder', name: e.name, path: r, children: await buildTree(path.join(dir, e.name), r) });
    } else if (e.isFile() && /\.md$/i.test(e.name)) {
      nodes.push({ type: 'page', name: e.name.replace(/\.md$/i, ''), path: r });
    }
  }
  nodes.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name, 'en') : a.type === 'folder' ? -1 : 1));
  return nodes;
}
async function* walkMd(dir, rel = '') {
  for (const e of await fsp.readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) yield* walkMd(path.join(dir, e.name), r);
    else if (e.isFile() && /\.md$/i.test(e.name)) yield r;
  }
}
async function search(q) {
  const needle = q.toLowerCase();
  const results = [];
  for await (const rel of walkMd(DATA_DIR)) {
    const text = await fsp.readFile(path.join(DATA_DIR, rel), 'utf8');
    const inTitle = rel.toLowerCase().includes(needle);
    const idx = text.toLowerCase().indexOf(needle);
    if (inTitle || idx >= 0) {
      const s = idx >= 0 ? Math.max(0, idx - 40) : 0;
      results.push({ path: rel, snippet: text.slice(s, s + 120).replace(/\s+/g, ' ') });
    }
    if (results.length >= 50) break;
  }
  return results;
}

// ---------- HTTP helpers ----------
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', c => { size += c.length; if (size > limit) { reject(httpErr(413, 'Too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
const readJson = async req => {
  const b = await readBody(req, 5 * 1024 * 1024);
  try { return JSON.parse(b.toString('utf8') || '{}'); } catch { throw httpErr(400, 'Invalid JSON'); }
};
function send(res, status, body, headers = {}) {
  const isObj = body !== null && typeof body === 'object' && !Buffer.isBuffer(body);
  res.writeHead(status, { 'X-Content-Type-Options': 'nosniff', ...(isObj ? { 'Content-Type': 'application/json; charset=utf-8' } : {}), ...headers });
  res.end(isObj ? JSON.stringify(body) : body);
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.pdf': 'application/pdf' };

async function serveFile(res, abs) {
  const st = await fsp.stat(abs).catch(() => null);
  if (!st || !st.isFile()) return send(res, 404, 'Not found');
  const ext = path.extname(abs).toLowerCase();
  const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream' };
  if (ext === '.svg') headers['Content-Security-Policy'] = "default-src 'none'; style-src 'unsafe-inline'"; // no script in SVG
  res.writeHead(200, { 'X-Content-Type-Options': 'nosniff', ...headers });
  fs.createReadStream(abs).pipe(res);
}

// ---------- Router ----------
async function handle(req, res) {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  const m = req.method;

  // Login / Logout
  if (p === '/api/login' && m === 'POST') {
    if (Date.now() < lockedUntil) return send(res, 429, { error: 'Too many attempts, please wait a moment' });
    const { password } = await readJson(req);
    if (typeof password === 'string' && passwordOk(password)) {
      failures = 0;
      const t = crypto.randomBytes(32).toString('hex');
      sessions.set(tokenKey(t), Date.now() + SESSION_MS);
      saveSessions();
      const cookie = `sid=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}` + (COOKIE_SECURE ? '; Secure' : '');
      return send(res, 200, { ok: true }, { 'Set-Cookie': cookie });
    }
    failures++;
    lockedUntil = Date.now() + Math.min(30000, 500 * 2 ** Math.min(failures, 6)); // 1s, 2s, 4s ... max 30s
    return send(res, 401, { error: 'Wrong password' });
  }
  if (p === '/api/logout' && m === 'POST') {
    const t = parseCookies(req).sid; if (t) { sessions.delete(tokenKey(t)); saveSessions(); }
    return send(res, 200, { ok: true }, { 'Set-Cookie': 'sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
  }

  // Static frontend files (the login page must load without logging in)
  if (m === 'GET' && !p.startsWith('/api/') && !p.startsWith('/files/')) {
    const name = p === '/' ? 'index.html' : dec(p.slice(1));
    const abs = path.resolve(PUBLIC_DIR, name);
    if (!abs.startsWith(PUBLIC_DIR + path.sep)) return send(res, 400, 'Invalid');
    return serveFile(res, abs);
  }

  // From here on, logged-in users only
  if (!isAuthed(req)) return send(res, 401, { error: 'Not logged in' });

  if (p === '/api/session' && m === 'GET') return send(res, 200, { ok: true });
  if (p === '/api/tree' && m === 'GET') return send(res, 200, await buildTree(DATA_DIR));
  if (p === '/api/search' && m === 'GET') return send(res, 200, await search((url.searchParams.get('q') || '').trim() || '\u0000'));

  if (p === '/api/page' && m === 'GET') {
    const rel = url.searchParams.get('path') || ''; requireMd(rel);
    const text = await fsp.readFile(safePath(rel), 'utf8').catch(() => { throw httpErr(404, 'Page not found'); });
    return send(res, 200, { path: rel, content: text });
  }
  if (p === '/api/page' && m === 'PUT') {
    const { path: rel, content } = await readJson(req); requireMd(rel);
    if (typeof content !== 'string') throw httpErr(400, 'content is missing');
    const abs = safePath(rel);
    await fsp.mkdir(path.dirname(abs), { recursive: true });
    const tmp = abs + '.tmp-' + process.pid;           // write atomically so nothing is left half-written
    await fsp.writeFile(tmp, content, 'utf8');
    await fsp.rename(tmp, abs);
    return send(res, 200, { ok: true });
  }
  if (p === '/api/folder' && m === 'POST') {
    const { path: rel } = await readJson(req);
    await fsp.mkdir(safePath(rel), { recursive: true });
    return send(res, 200, { ok: true });
  }
  if (p === '/api/rename' && m === 'POST') {
    const { from, to } = await readJson(req);
    const a = safePath(from), b = safePath(to);
    if (a === DATA_DIR || b === DATA_DIR) throw httpErr(400, 'Invalid');
    if (fs.existsSync(b)) throw httpErr(409, 'Target already exists');
    await fsp.mkdir(path.dirname(b), { recursive: true });
    await fsp.rename(a, b);
    return send(res, 200, { ok: true });
  }
  if (p === '/api/item' && m === 'DELETE') {
    const rel = url.searchParams.get('path') || '';
    const abs = safePath(rel);
    if (abs === DATA_DIR) throw httpErr(400, 'Invalid');
    await fsp.rm(abs, { recursive: true, force: true });
    return send(res, 200, { ok: true });
  }
  // Image upload: raw data in the body, file name in the query (?name=image.png). Ends up in assets/.
  if (p === '/api/upload' && m === 'POST') {
    const raw = path.basename(url.searchParams.get('name') || 'file');
    const clean = raw.replace(/[^\w.\-]+/g, '_').replace(/^\.+/, '') || 'file';
    const ext = path.extname(clean).toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.pdf'].includes(ext)) throw httpErr(400, 'File type not allowed');
    const buf = await readBody(req, MAX_UPLOAD);
    let name = clean, n = 1;
    const dir = path.join(DATA_DIR, 'assets');
    await fsp.mkdir(dir, { recursive: true });
    while (fs.existsSync(path.join(dir, name))) name = `${path.basename(clean, ext)}-${n++}${ext}`;
    await fsp.writeFile(path.join(dir, name), buf);
    return send(res, 200, { ok: true, url: '/files/assets/' + encodeURIComponent(name), markdown: `![${name}](/files/assets/${encodeURIComponent(name)})` });
  }
  // Embedded files (images etc.), non-Markdown only
  if (p.startsWith('/files/') && m === 'GET') {
    const rel = dec(p.slice('/files/'.length));
    if (/\.md$/i.test(rel)) throw httpErr(403, 'Forbidden');
    return serveFile(res, safePath(rel));
  }
  // Backup: the whole data folder (pages + images, no session file) as a .tar.gz download
  if (p === '/api/export' && m === 'GET') {
    const entries = (await fsp.readdir(DATA_DIR)).filter(n => !n.startsWith('.'));
    if (!entries.length) throw httpErr(404, 'Nothing to export yet');
    const day = new Date().toISOString().slice(0, 10);
    const tar = spawn('tar', ['czf', '-', '-C', DATA_DIR, ...entries], { stdio: ['ignore', 'pipe', 'inherit'] });
    res.writeHead(200, { 'Content-Type': 'application/gzip', 'Content-Disposition': `attachment; filename="mdwiki-${day}.tar.gz"`, 'X-Content-Type-Options': 'nosniff' });
    tar.stdout.pipe(res);
    tar.on('error', e => { console.error('export failed:', e.message); res.destroy(); });
    res.on('close', () => tar.kill());
    return;
  }
  return send(res, 404, { error: 'Not found' });
}

http.createServer((req, res) => {
  handle(req, res).catch(err => {
    const status = err.status || (err.code === 'ENOENT' ? 404 : 500);
    if (status === 500) console.error(err);
    if (!res.headersSent) send(res, status, { error: status === 500 ? 'Server error' : err.message });
    else res.end();
  });
}).listen(PORT, () => console.log(`mdwiki running on port ${PORT}, data: ${DATA_DIR}`));

// Graceful shutdown: write pending sessions right away and exit at once.
// (Node as PID 1 in Docker ignores SIGTERM without a handler, so "docker compose restart" would wait 10 s and then kill it.)
function shutdown() {
  clearTimeout(saveTimer);
  try {
    for (const [k, exp] of sessions) if (exp < Date.now()) sessions.delete(k);
    const tmp = SESSION_FILE + '.tmp-' + process.pid;
    fs.writeFileSync(tmp, JSON.stringify(Object.fromEntries(sessions)), { mode: 0o600 });
    fs.renameSync(tmp, SESSION_FILE);
  } catch (e) { console.error('Could not save sessions:', e.message); }
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
