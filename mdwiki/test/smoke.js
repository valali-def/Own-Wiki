'use strict';
// Smoke test for server.js. Usage: node test/smoke.js   (starts its own server on a temp data dir)
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const PORT = 3900 + Math.floor(Math.random() * 90);
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'mdwiki-test-'));
const PW = 'test-password';
const BASE = 'http://127.0.0.1:' + PORT;
let cookie = '', fails = 0, passes = 0;
const ok = (c, name) => { if (c) { passes++; console.log('  ok   ' + name); } else { fails++; console.log('  FAIL ' + name); } };
async function api(method, url, body, raw) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  let b;
  if (raw) b = raw; else if (body !== undefined) { headers['content-type'] = 'application/json'; b = JSON.stringify(body); }
  const r = await fetch(BASE + url, { method, headers, body: b, redirect: 'manual' });
  const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
  const ct = r.headers.get('content-type') || '';
  const data = ct.includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer());
  return { status: r.status, data, headers: r.headers };
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
function startServer() {
  const p = spawn('node', [path.join(__dirname, '..', 'server.js')], { env: { ...process.env, PORT, DATA_DIR: DATA, APP_PASSWORD: PW }, stdio: ['ignore', 'pipe', 'inherit'] });
  return new Promise(res => p.stdout.on('data', d => String(d).includes('running') && res(p)));
}
(async () => {
  let srv = await startServer();
  try {
    console.log('Static + auth');
    ok((await api('GET', '/')).status === 200, 'index.html served without login');
    ok((await api('GET', '/style.css')).status === 200, 'style.css served');
    ok((await api('GET', '/app.js')).status === 200, 'app.js served');
    ok((await api('GET', '/server.js')).status === 404, 'server.js is NOT served');
    ok((await api('GET', '/api/tree')).status === 401, 'tree needs login');
    let r = await api('POST', '/api/login', { password: 'wrong' });
    ok(r.status === 401, 'wrong password rejected');
    r = await api('POST', '/api/login', { password: PW });
    ok(r.status === 429, 'login brake active right after a failure');
    await sleep(1200);
    r = await api('POST', '/api/login', { password: PW });
    ok(r.status === 200 && cookie.startsWith('sid='), 'right password accepted, cookie set');
    ok((r.headers.get('set-cookie') || '').includes('HttpOnly'), 'cookie is HttpOnly');
    ok((await api('GET', '/api/session')).status === 200, 'session valid');

    console.log('Pages');
    r = await api('PUT', '/api/page', { path: 'Technik/Homelab/Server/Docker.md', content: '# Docker\n\n**bold**' });
    ok(r.status === 200, 'save page (creates folders)');
    ok(fs.readFileSync(path.join(DATA, 'Technik/Homelab/Server/Docker.md'), 'utf8') === '# Docker\n\n**bold**', 'file really exists on disk');
    r = await api('GET', '/api/page?path=Technik/Homelab/Server/Docker.md');
    ok(r.data.content === '# Docker\n\n**bold**', 'read page back');
    ok((await api('GET', '/api/page?path=Nope.md')).status === 404, 'missing page -> 404');
    ok((await api('GET', '/api/page?path=Nope.txt')).status === 400, 'non-.md rejected');
    r = await api('GET', '/api/tree');
    ok(r.data[0].name === 'Technik' && r.data[0].children[0].children[0].children[0].name === 'Docker', 'tree has Shelf/Book/Chapter/Page');
    r = await api('POST', '/api/folder', { path: 'Archiv' });
    ok(r.status === 200 && fs.existsSync(path.join(DATA, 'Archiv')), 'create folder');
    r = await api('GET', '/api/search?q=bold');
    ok(r.data.length === 1 && r.data[0].path.endsWith('Docker.md'), 'full-text search finds content');
    r = await api('GET', '/api/search?q=docker');
    ok(r.data.length === 1, 'search finds by title');

    console.log('Rename / move / delete');
    r = await api('POST', '/api/rename', { from: 'Technik/Homelab/Server/Docker.md', to: 'Archiv/Docker.md' });
    ok(r.status === 200 && fs.existsSync(path.join(DATA, 'Archiv/Docker.md')), 'move page');
    r = await api('POST', '/api/rename', { from: 'Archiv/Docker.md', to: 'Archiv/Docker.md' });
    ok(r.status === 409, 'rename onto existing target -> 409');
    r = await api('DELETE', '/api/item?path=Technik');
    ok(r.status === 200 && !fs.existsSync(path.join(DATA, 'Technik')), 'delete folder');
    ok((await api('DELETE', '/api/item?path=')).status === 400, 'cannot delete the data root');

    console.log('Security');
    ok((await api('GET', '/api/page?path=../server.js')).status === 400, 'path traversal blocked (..)');
    ok((await api('PUT', '/api/page', { path: '../evil.md', content: 'x' })).status === 400, 'write outside data blocked');
    ok((await api('PUT', '/api/page', { path: '.hidden/x.md', content: 'x' })).status === 400, 'dot-folders blocked');
    ok((await api('GET', '/files/Archiv/Docker.md')).status === 403, '.md not served via /files');
    ok((await api('GET', '/files/..%2Fserver.js')).status >= 400, 'traversal via /files blocked');
    ok((await api('GET', '/files/%E0%A4%A')).status === 400, 'malformed URL escape -> 400, not 500');
    ok((await api('GET', '/%2e%2e/server.js')).status >= 400, 'traversal via static blocked');

    console.log('Upload');
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    r = await api('POST', '/api/upload?name=pic.png', undefined, png);
    ok(r.status === 200 && r.data.markdown === '![pic.png](/files/assets/pic.png)', 'upload png returns markdown line');
    r = await api('POST', '/api/upload?name=pic.png', undefined, png);
    ok(r.data.url === '/files/assets/pic-1.png', 'duplicate name gets a suffix');
    r = await api('GET', '/files/assets/pic.png');
    ok(r.status === 200 && Buffer.compare(r.data, png) === 0, 'uploaded image served unchanged');
    ok((await api('POST', '/api/upload?name=evil.html', undefined, Buffer.from('<script>'))).status === 400, 'html upload rejected');
    ok(!JSON.stringify((await api('GET', '/api/tree')).data).includes('assets'), 'assets folder hidden in tree');

    console.log('Export');
    r = await api('GET', '/api/export');
    ok(r.status === 200 && (r.headers.get('content-type') || '').includes('gzip'), 'export returns a gzip download');
    ok(r.data[0] === 0x1f && r.data[1] === 0x8b, 'export body is a real gzip stream');
    const tarList = require('child_process').spawnSync('tar', ['tzf', '-'], { input: r.data }).stdout.toString();
    ok(tarList.includes('Archiv/Docker.md') && tarList.includes('assets/pic.png'), 'export contains pages and images');
    ok(!tarList.includes('.sessions'), 'export does not contain the session file');

    console.log('Sessions + restart');
    srv.kill(); await sleep(300);
    srv = await startServer();
    ok((await api('GET', '/api/tree')).status === 200, 'session survives a restart (persistent sessions)');
    ok(!fs.readFileSync(path.join(DATA, '.sessions.json'), 'utf8').includes(cookie.slice(4)), 'session file stores hashes, not raw tokens');
    ok(fs.existsSync(path.join(DATA, 'Archiv/Docker.md')), 'pages survive restart');
    await api('POST', '/api/logout', {});
    ok((await api('GET', '/api/tree')).status === 401, 'logged out');
    await sleep(400);
    srv.kill(); await sleep(300);
    srv = await startServer();
    ok((await api('GET', '/api/tree')).status === 401, 'logged-out session stays dead after restart');
  } catch (e) { fails++; console.error('TEST CRASHED', e); }
  await new Promise(r => { srv.once('exit', r); srv.kill(); });
  fs.rmSync(DATA, { recursive: true, force: true });
  console.log(`\n${passes} passed, ${fails} failed`);
  process.exit(fails ? 1 : 0);
})();
