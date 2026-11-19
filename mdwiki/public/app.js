/* ===== Eigene Dialoge (ersetzen prompt/confirm/alert) ===== */
function uiDialog({ message, input, value, ok = "OK", cancel = "Cancel", danger = false, alertOnly = false }) {
  return new Promise((resolve) => {
    const wrap = document.createElement("div");
    wrap.className = "modal-back";
    wrap.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true">' +
      '<div class="modal-msg"></div>' +
      (input ? '<input class="modal-input" type="text" spellcheck="false">' : "") +
      '<div class="modal-btns">' +
      (alertOnly ? "" : '<button type="button" data-r="cancel"></button>') +
      '<button type="button" data-r="ok" class="' + (danger ? "danger-solid" : "primary") + '"></button>' +
      "</div></div>";
    wrap.querySelector(".modal-msg").textContent = message;
    const inp = wrap.querySelector(".modal-input");
    if (inp) inp.value = value || "";
    const bc = wrap.querySelector('[data-r="cancel"]');
    if (bc) bc.textContent = cancel;
    wrap.querySelector('[data-r="ok"]').textContent = ok;
    const prevFocus = document.activeElement;
    const done = (okRes) => {
      document.removeEventListener("keydown", onKey, true);
      wrap.remove();
      if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch (e) {}
      resolve(okRes);
    };
    const result = (okRes) => done(input ? (okRes ? inp.value : null) : okRes);
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); result(false); }
      else if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); result(true); }
    };
    document.addEventListener("keydown", onKey, true);
    wrap.addEventListener("mousedown", (e) => { if (e.target === wrap) result(false); });
    wrap.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-r]");
      if (b) result(b.dataset.r === "ok");
    });
    document.body.appendChild(wrap);
    if (inp) { inp.focus(); inp.select(); } else wrap.querySelector('[data-r="ok"]').focus();
  });
}
const uiPrompt = (message, value) => uiDialog({ message, input: true, value });
const uiConfirm = (message) => uiDialog({ message, ok: /delete/i.test(message) ? "Delete" : "OK", danger: /delete/i.test(message) });
const uiAlert = (message) => uiDialog({ message, alertOnly: true });

"use strict";
const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const ICON = {
  shelf: "i-shelf",
  book: "i-book",
  chapter: "i-chapter",
  page: "i-page",
};
const LABEL = {
  shelf: "Shelf",
  book: "Book",
  chapter: "Chapter",
  page: "Page",
};
const ico = (k) => `<svg><use href="#${ICON[k]}"/></svg>`;
const store = {
  get: (k) => {
    try {
      return localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch (e) {}
  },
};

let tree = [],
  index = new Map();
let sel = "",
  pageContent = "",
  editing = false,
  dirty = false;

async function api(method, url, body) {
  const opt = { method, headers: {} };
  if (body !== undefined) {
    opt.headers["Content-Type"] = "application/json";
    opt.body = JSON.stringify(body);
  }
  const r = await fetch(url, opt);
  if (r.status === 401 && url !== "/api/login") {
    showLogin();
    throw new Error("Not logged in");
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "Error " + r.status);
  return data;
}
const setStatus = (t) => {
  $("status").textContent = t;
};

// ---- Markdown ----
// Rendered with "marked" (public/vendor/marked.umd.js, served locally so it works offline).
// Safety rules (do not remove): raw HTML in the text is ESCAPED, never rendered,
// and link/image addresses must pass safeUrl() (no javascript:, data:, vbscript: ...).
function safeUrl(u) {
  u = String(u || "").trim();
  // allowed: http(s), mailto, tel, absolute or relative paths, #anchors, and addresses without a scheme
  return /^(https?:|mailto:|tel:|\/|#|\.{1,2}\/|[^:]*$)/i.test(u) ? u : "#";
}
const mdParser =
  typeof marked !== "undefined"
    ? new marked.Marked({
        gfm: true,
        renderer: {
          html({ text, block }) {
            return block ? `<p>${esc(text.trim())}</p>\n` : esc(text);
          },
          link({ href, title, tokens }) {
            const t = title ? ` title="${esc(title)}"` : "";
            return `<a href="${esc(safeUrl(href))}"${t} target="_blank" rel="noopener">${this.parser.parseInline(tokens)}</a>`;
          },
          image({ href, title, text }) {
            const t = title ? ` title="${esc(title)}"` : "";
            return `<img alt="${esc(text)}" src="${esc(safeUrl(href))}"${t}>`;
          },
        },
      })
    : null;
function md(src) {
  src = String(src).replace(/\r/g, "");
  // If the library failed to load, show the text as-is instead of breaking the page.
  if (!mdParser) return `<pre>${esc(src)}</pre>`;
  return mdParser.parse(src);
}
// ---- end Markdown ----

// ---- Login / account ----
function showLogin() {
  $("app").hidden = true;
  $("login").hidden = false;
  $("pw").focus();
}
function showApp() {
  $("login").hidden = true;
  $("app").hidden = false;
  init();
}
$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await api("POST", "/api/login", { password: $("pw").value });
    $("pw").value = "";
    $("loginErr").textContent = "";
    showApp();
  } catch (err) {
    $("loginErr").textContent = err.message;
  }
});
$("logout").onclick = async () => {
  await api("POST", "/api/logout", {}).catch(() => {});
  showLogin();
};
$("acctBtn").onclick = (e) => {
  e.stopPropagation();
  $("acctMenu").hidden = !$("acctMenu").hidden;
};
document.addEventListener("click", () => {
  $("acctMenu").hidden = true;
});
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  store.set("theme", t);
  $("themeToggle").textContent =
    t === "dark" ? "Switch to light mode" : "Switch to dark mode";
}
$("themeToggle").onclick = () =>
  applyTheme(
    document.documentElement.dataset.theme === "dark" ? "light" : "dark",
  );
applyTheme(document.documentElement.dataset.theme || "dark");

// ---- Tree data ----
function buildIndex(nodes, depth, parent) {
  for (const n of nodes) {
    n.depth = depth;
    n.parent = parent;
    n.kind =
      n.type === "page"
        ? "page"
        : depth === 1
          ? "shelf"
          : depth === 2
            ? "book"
            : "chapter";
    index.set(n.path, n);
    if (n.children) buildIndex(n.children, depth + 1, n.path);
  }
}
async function refresh() {
  tree = await api("GET", "/api/tree");
  index = new Map();
  buildIndex(tree, 1, "");
}
const chain = (p) => {
  const o = [];
  let n = index.get(p);
  while (n) {
    o.unshift(n);
    n = index.get(n.parent);
  }
  return o;
};
const all = () => [...index.values()];

// ---- Navigation / views ----
async function leaveEditor() {
  if (!editing) return true;
  if (dirty && !await uiConfirm("Discard unsaved changes?")) return false;
  editing = false;
  dirty = false;
  $("editorWrap").hidden = true;
  $("view").hidden = false;
  return true;
}
async function go(path) {
  if (!(await leaveEditor())) return;
  $("search").value = "";
  const n = index.get(path);
  try {
    if (!n) return showHome();
    if (n.type === "page") return await showPage(n);
    showFolder(n);
  } catch (e) {
    uiAlert(e.message);
  }
}
const setView = (html) => {
  $("view").innerHTML = html;
  $("content").scrollTop = 0;
};
const sub = (n, withPath) => {
  if (n.type === "page") return esc(n.parent.replace(/\//g, " › "));
  const f = n.children.filter((c) => c.type === "folder").length,
    p = n.children.length - f;
  const bits = [];
  if (f) bits.push(f + (f === 1 ? " folder" : " folders"));
  if (p) bits.push(p + (p === 1 ? " page" : " pages"));
  return esc(
    (withPath && n.parent ? n.parent.replace(/\//g, " › ") + " · " : "") +
      (bits.join(", ") || "empty"),
  );
};
const cards = (nodes, withPath) =>
  '<div class="cards">' +
  nodes
    .map(
      (n) =>
        `<div class="card t-${n.kind}" data-p="${esc(n.path)}"><h3>${ico(n.kind)}<span>${esc(n.name)}</span></h3><div class="muted">${sub(n, withPath)}</div></div>`,
    )
    .join("") +
  "</div>";
const title = (kind, text) =>
  `<h1 class="vh">${ico(kind)}<span>${esc(text)}</span></h1>`;

function showHome() {
  sel = "";
  const top = tree;
  setView(
    title("shelf", "Own Wiki") +
      (top.length
        ? cards(top)
        : '<p class="muted">Nothing here yet. Use “New shelf” on the right to start.</p>'),
  );
  chrome();
}
function showList(kind) {
  const d = { shelves: 1, books: 2, chapters: 3 }[kind],
    k = { shelves: "shelf", books: "book", chapters: "chapter" }[kind];
  const label = kind[0].toUpperCase() + kind.slice(1),
    nodes = all().filter((n) => n.type === "folder" && n.depth === d);
  sel = "";
  setView(
    title(k, label) +
      (nodes.length
        ? cards(nodes, true)
        : `<p class="muted">No ${kind} yet.</p>`),
  );
  chrome(label);
}
function showFolder(n) {
  sel = n.path;
  setView(
    title(n.kind, n.name) +
      (n.children.length
        ? cards(n.children)
        : '<p class="muted">Empty. Use the actions on the right to add something.</p>'),
  );
  chrome();
}
async function showPage(n) {
  const d = await api("GET", "/api/page?path=" + encodeURIComponent(n.path));
  pageContent = d.content;
  sel = n.path;
  renderPageView();
  chrome();
}
function renderPageView() {
  setView(
    pageContent.trim()
      ? `<div class="md-body">${md(pageContent)}</div>`
      : '<p class="muted">This page is empty. Click “Edit” to write.</p>',
  );
}

// ---- Chrome: breadcrumbs, side navigation, details, actions ----
function chrome(listLabel) {
  renderCrumbs(listLabel);
  renderNav();
  renderDetails();
  renderActions();
  try {
    history.replaceState(
      null,
      "",
      sel ? "#" + encodeURIComponent(sel) : location.pathname,
    );
  } catch (e) {}
}
function renderCrumbs(label) {
  const parts = ['<a data-p="">Home</a>'];
  for (const n of chain(sel))
    parts.push(
      `<a class="t-${n.kind}" data-p="${esc(n.path)}">${ico(n.kind)}${esc(n.name)}</a>`,
    );
  if (label) parts.push(`<a>${esc(label)}</a>`);
  $("crumbs").innerHTML = parts.join('<span class="sep">›</span>');
}
const nodeHtml = (n) =>
  `<div class="node t-${n.kind}${n.path === sel ? " active" : ""}" data-p="${esc(n.path)}">${ico(n.kind)}<span>${esc(n.name)}</span></div>` +
  (n.type === "folder" && n.children.length
    ? `<div class="children">${n.children.map(nodeHtml).join("")}</div>`
    : "");
function renderNav() {
  const ch = chain(sel);
  const root =
    ch.find((x) => x.type === "folder" && x.depth === 2) ||
    ch.find((x) => x.type === "folder" && x.depth === 1) ||
    null;
  document.querySelector("#navSide .side-title").textContent = root
    ? root.name
    : "Shelves";
  $("tree").innerHTML = root
    ? root.children.map(nodeHtml).join("") || '<p class="muted">Empty</p>'
    : tree
        .map(
          (n) =>
            `<div class="node t-${n.kind}" data-p="${esc(n.path)}">${ico(n.kind)}<span>${esc(n.name)}</span></div>`,
        )
        .join("");
}
function renderDetails() {
  const n = index.get(sel),
    cnt = (k) => all().filter((x) => x.kind === k).length;
  if (!n) {
    $("details").innerHTML =
      `Shelves: ${cnt("shelf")}<br>Books: ${cnt("book")}<br>Chapters: ${cnt("chapter")}<br>Pages: ${cnt("page")}`;
    return;
  }
  let h = `Type: ${LABEL[n.kind]}<br>Name: ${esc(n.name)}<br>Path: ${esc(n.path)}`;
  if (n.type === "page") {
    const w = (pageContent.trim().match(/\S+/g) || []).length;
    h += `<br>Words: ${w}`;
  } else h += `<br>Contains: ${sub(n)}`;
  $("details").innerHTML = h;
}
const ctxFolder = () => {
  const n = index.get(sel);
  return !n ? null : n.type === "folder" ? n : index.get(n.parent) || null;
};
function renderActions() {
  const n = index.get(sel),
    ctx = ctxFolder(),
    d = ctx ? ctx.depth : 0;
  $("edit").disabled = !(n && n.type === "page") || editing;
  $("rename").disabled = $("delete").disabled = !n;
  $("newFolder").textContent =
    "New " + (["shelf", "book", "chapter"][d] || "folder");
}
for (const id of ["view", "crumbs", "tree"])
  $(id).addEventListener("click", (e) => {
    const c = e.target.closest("[data-p]");
    if (c) go(c.dataset.p);
  });
$("logo").onclick = (e) => {
  e.preventDefault();
  go("");
};
for (const b of document.querySelectorAll("#topnav button"))
  b.onclick = async () => {
    if (await leaveEditor()) {
      $("search").value = "";
      showList(b.dataset.view);
    }
  };

// ---- Actions ----
$("newPage").onclick = async () => {
  const ctx = ctxFolder();
  let name = await uiPrompt(
    "Name of the new page" + (ctx ? ` (in ${ctx.path})` : "") + ":",
  );
  if (!name) return;
  if (!(await leaveEditor())) return;
  name = name.replace(/\.md$/i, "");
  const p = (ctx ? ctx.path + "/" : "") + name + ".md";
  try {
    await api("PUT", "/api/page", { path: p, content: "# " + name + "\n\n" });
    await refresh();
    await go(p);
    openEditor();
  } catch (e) {
    uiAlert(e.message);
  }
};
$("newFolder").onclick = async () => {
  const ctx = ctxFolder(),
    what = $("newFolder").textContent.replace("New ", "");
  const name = await uiPrompt(
    `Name of the new ${what}` + (ctx ? ` (in ${ctx.path})` : "") + ":",
  );
  if (!name) return;
  if (!(await leaveEditor())) return;
  const p = (ctx ? ctx.path + "/" : "") + name;
  try {
    await api("POST", "/api/folder", { path: p });
    await refresh();
    await go(p);
  } catch (e) {
    uiAlert(e.message);
  }
};
$("rename").onclick = async () => {
  const n = index.get(sel);
  if (!n) return;
  let to = await uiPrompt("New path (rename or move):", n.path);
  if (!to || to === n.path) return;
  if (!(await leaveEditor())) return;
  if (n.type === "page" && !/\.md$/i.test(to)) to += ".md";
  try {
    await api("POST", "/api/rename", { from: n.path, to });
    await refresh();
    await go(to);
  } catch (e) {
    uiAlert(e.message);
  }
};
$("delete").onclick = async () => {
  const n = index.get(sel);
  if (!n) return;
  if (
    !await uiConfirm(
      "Really delete: " +
        n.path +
        (n.type === "folder" ? " (including everything inside)" : "") +
        "?",
    )
  )
    return;
  if (!(await leaveEditor())) return;
  try {
    await api("DELETE", "/api/item?path=" + encodeURIComponent(n.path));
    await refresh();
    await go(n.parent);
  } catch (e) {
    uiAlert(e.message);
  }
};

// ---- Editor ----
function setMode(m) {
  store.set("editMode", m);
  for (const b of document.querySelectorAll("#modeSwitch button"))
    b.classList.toggle("on", b.dataset.mode === m);
  $("preview").hidden = m !== "split";
  if (m === "split") $("preview").innerHTML = md($("editor").value);
}
for (const b of document.querySelectorAll("#modeSwitch button"))
  b.onclick = () => setMode(b.dataset.mode);
function openEditor() {
  const n = index.get(sel);
  if (!n || n.type !== "page") return;
  editing = true;
  dirty = false;
  $("view").hidden = true;
  $("editorWrap").hidden = false;
  $("editor").disabled = false;
  $("editor").value = pageContent;
  $("save").disabled = false;
  $("current").textContent = n.path;
  setStatus("");
  setMode(store.get("editMode") === "split" ? "split" : "md");
  renderActions();
  $("editor").focus();
}
$("edit").onclick = openEditor;
$("closeEdit").onclick = async () => {
  if (await leaveEditor()) {
    renderPageView();
    renderActions();
  }
};
async function save() {
  if (!editing) return;
  await api("PUT", "/api/page", { path: sel, content: $("editor").value });
  pageContent = $("editor").value;
  dirty = false;
  setStatus("Saved " + new Date().toLocaleTimeString());
  renderDetails();
}
$("save").onclick = () => save().catch((x) => uiAlert(x.message));
let raf = 0;
$("editor").addEventListener("input", () => {
  dirty = true;
  setStatus("Unsaved");
  if (!$("preview").hidden && !raf)
    raf = requestAnimationFrame(() => {
      raf = 0;
      $("preview").innerHTML = md($("editor").value);
    });
});
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "s" && editing) {
    e.preventDefault();
    save().catch((x) => uiAlert(x.message));
  }
});
window.addEventListener("beforeunload", (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});

// ---- Search ----
let st;
$("search").addEventListener("input", () => {
  clearTimeout(st);
  st = setTimeout(async () => {
    const q = $("search").value.trim();
    if (editing) {
      setStatus("Close the editor to search");
      return;
    }
    if (!q) return go(sel);
    const res = await api(
      "GET",
      "/api/search?q=" + encodeURIComponent(q),
    ).catch(() => []);
    setView(
      title("page", "Search: " + q) +
        (res.length
          ? '<div class="cards">' +
            res
              .map((r) => {
                const n = index.get(r.path);
                return `<div class="card t-page" data-p="${esc(r.path)}"><h3>${ico("page")}<span>${esc(n ? n.name : r.path)}</span></h3><div class="muted">${esc(r.path.replace(/\//g, " › "))}</div><div class="hit">${esc(r.snippet || "")}</div></div>`;
              })
              .join("") +
            "</div>"
          : '<p class="muted">Nothing found</p>'),
    );
    sel = "";
    renderCrumbs("Search");
    renderNav();
    renderDetails();
    renderActions();
  }, 250);
});
$("search").addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    $("search").value = "";
    go(sel);
  }
});

// ---- Start ----
async function init() {
  try {
    await refresh();
    await go(decodeURIComponent(location.hash.slice(1)));
  } catch (e) {
    /* login shown by api() on 401 */
  }
}
api("GET", "/api/session").then(showApp).catch(showLogin);

