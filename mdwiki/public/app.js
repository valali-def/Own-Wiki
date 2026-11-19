'use strict';
const $ = id => document.getElementById(id);
let currentPath = null, dirty = false;

async function api(method, url, body) {
  const opt = { method, headers: {} };
  if (body !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
  const r = await fetch(url, opt);
  if (r.status === 401 && url !== '/api/login') { showLogin(); throw new Error('Not logged in'); }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Error ' + r.status);
  return data;
}
const setStatus = t => { $('status').textContent = t; };

// ---- Login ----
function showLogin() { $('app').hidden = true; $('login').hidden = false; $('pw').focus(); }
function showApp() { $('login').hidden = true; $('app').hidden = false; loadTree(); }
$('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  try { await api('POST', '/api/login', { password: $('pw').value }); $('pw').value = ''; $('loginErr').textContent = ''; showApp(); }
  catch (err) { $('loginErr').textContent = err.message; }
});
$('logout').onclick = async () => { await api('POST', '/api/logout', {}).catch(() => {}); showLogin(); };

// ---- Tree ----
function renderNodes(nodes, parent) {
  for (const n of nodes) {
    const el = document.createElement('div');
    el.className = 'node ' + n.type + (n.path === currentPath ? ' active' : '');
    el.textContent = (n.type === 'folder' ? '📁 ' : '') + n.name;
    el.dataset.path = n.path;
    el.onclick = ev => { ev.stopPropagation(); if (n.type === 'page') openPage(n.path); else selectFolder(n.path); };
    parent.appendChild(el);
    if (n.type === 'folder') {
      const c = document.createElement('div'); c.className = 'children'; parent.appendChild(c);
      renderNodes(n.children, c);
    }
  }
}
let selectedFolder = '';
function selectFolder(p) { selectedFolder = p; setStatus('Folder: ' + p); }
async function loadTree() {
  const tree = await api('GET', '/api/tree');
  const t = $('tree'); t.innerHTML = ''; renderNodes(tree, t);
}

// ---- Pages ----
async function openPage(p) {
  if (dirty && !confirm('Discard unsaved changes?')) return;
  const d = await api('GET', '/api/page?path=' + encodeURIComponent(p));
  currentPath = p; dirty = false;
  $('editor').value = d.content; $('editor').disabled = false;
  $('current').textContent = p;
  for (const id of ['save', 'rename', 'delete']) $(id).disabled = false;
  setStatus(''); loadTree();
}
async function save() {
  if (!currentPath) return;
  await api('PUT', '/api/page', { path: currentPath, content: $('editor').value });
  dirty = false; setStatus('Saved ' + new Date().toLocaleTimeString());
}
$('save').onclick = save;
$('editor').addEventListener('input', () => { dirty = true; setStatus('Unsaved'); });
document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save().catch(x => alert(x.message)); } });
window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

$('newPage').onclick = async () => {
  let name = prompt('Name of the new page' + (selectedFolder ? ` (in ${selectedFolder})` : '') + ':');
  if (!name) return;
  name = name.replace(/\.md$/i, '');
  const p = (selectedFolder ? selectedFolder + '/' : '') + name + '.md';
  try { await api('PUT', '/api/page', { path: p, content: '# ' + name + '\n\n' }); await openPage(p); } catch (e) { alert(e.message); }
};
$('newFolder').onclick = async () => {
  const name = prompt('Name of the new folder:'); if (!name) return;
  try { await api('POST', '/api/folder', { path: (selectedFolder ? selectedFolder + '/' : '') + name }); loadTree(); } catch (e) { alert(e.message); }
};
$('rename').onclick = async () => {
  const to = prompt('New path:', currentPath); if (!to || to === currentPath) return;
  try { await api('POST', '/api/rename', { from: currentPath, to: /\.md$/i.test(to) ? to : to + '.md' }); currentPath = to; $('current').textContent = to; loadTree(); } catch (e) { alert(e.message); }
};
$('delete').onclick = async () => {
  if (!confirm('Really delete: ' + currentPath + '?')) return;
  try { await api('DELETE', '/api/item?path=' + encodeURIComponent(currentPath)); currentPath = null; dirty = false;
    $('editor').value = ''; $('editor').disabled = true; $('current').textContent = 'No page open';
    for (const id of ['save', 'rename', 'delete']) $(id).disabled = true; loadTree(); } catch (e) { alert(e.message); }
};

// ---- Search ----
let st;
$('search').addEventListener('input', () => {
  clearTimeout(st);
  st = setTimeout(async () => {
    const q = $('search').value.trim();
    if (!q) return loadTree();
    const res = await api('GET', '/api/search?q=' + encodeURIComponent(q)).catch(() => []);
    const t = $('tree'); t.innerHTML = '';
    for (const r of res) {
      const el = document.createElement('div'); el.className = 'node';
      el.textContent = r.path;
      const s = document.createElement('div'); s.className = 'hit'; s.textContent = r.snippet; el.appendChild(s);
      el.onclick = () => openPage(r.path);
      t.appendChild(el);
    }
    if (!res.length) t.textContent = 'Nothing found';
  }, 250);
});

// ---- Start ----
api('GET', '/api/session').then(showApp).catch(showLogin);
