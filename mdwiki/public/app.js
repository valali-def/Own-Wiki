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
function url(u) {
  return /^\s*(javascript|data|vbscript):/i.test(u) ? "#" : u;
}
function inline(t) {
  const codes = [];
  t = t.replace(/`([^`]+)`/g, (_, c) => {
    codes.push(c);
    return "\u0000" + (codes.length - 1) + "\u0000";
  });
  t = t.replace(
    /!\[([^\]]*)\]\(([^)\s]+)\)/g,
    (_, a, u) => `<img alt="${a}" src="${url(u)}">`,
  );
  t = t.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_, a, u) => `<a href="${url(u)}" target="_blank" rel="noopener">${a}</a>`,
  );
  t = t
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>");
  return t.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
}
const isTableSep = (l) =>
  l !== undefined &&
  /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(l) &&
  l.includes("-");
const cells = (r) =>
  r
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());
const LIST = /^(\s*)([-*+]|\d+\.)\s+(.*)$/;
function startsBlock(l, next) {
  return (
    /^(```|#{1,6}\s|&gt;|\s*([-*+]|\d+\.)\s|(-{3,}|\*{3,})\s*$)/.test(l) ||
    (l.includes("|") && isTableSep(next))
  );
}
function list(lines, i) {
  const items = [];
  while (i < lines.length && LIST.test(lines[i])) {
    const m = lines[i].match(LIST);
    items.push({ d: m[1].length, ord: /\d/.test(m[2]), t: m[3] });
    i++;
  }
  let html = "",
    stack = [];
  const text = (t) =>
    inline(t).replace(
      /^\[( |x)\]\s/i,
      (_, c) =>
        `<input type="checkbox" disabled${c !== " " ? " checked" : ""}> `,
    );
  for (const it of items) {
    while (stack.length && it.d < stack[stack.length - 1].d)
      html += "</li></" + stack.pop().tag + ">";
    const top = stack[stack.length - 1];
    if (!top || it.d > top.d) {
      const tag = it.ord ? "ol" : "ul";
      stack.push({ d: it.d, tag });
      html += `<${tag}><li>` + text(it.t);
    } else html += "</li><li>" + text(it.t);
  }
  while (stack.length) html += "</li></" + stack.pop().tag + ">";
  return [html, i];
}
function blocks(lines) {
  const out = [];
  let i = 0,
    m;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) {
      i++;
      continue;
    }
    if (/^```/.test(l)) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code>${buf.join("\n")}</code></pre>`);
      continue;
    }
    if ((m = l.match(/^(#{1,6})\s+(.*)$/))) {
      out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`);
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,})\s*$/.test(l)) {
      out.push("<hr>");
      i++;
      continue;
    }
    if (/^&gt;/.test(l)) {
      const buf = [];
      while (i < lines.length && /^&gt;/.test(lines[i]))
        buf.push(lines[i++].replace(/^&gt;\s?/, ""));
      out.push(`<blockquote>${blocks(buf)}</blockquote>`);
      continue;
    }
    if (LIST.test(l)) {
      const [h, ni] = list(lines, i);
      out.push(h);
      i = ni;
      continue;
    }
    if (l.includes("|") && isTableSep(lines[i + 1])) {
      const head = cells(l);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim())
        rows.push(cells(lines[i++]));
      out.push(
        "<table><thead><tr>" +
          head.map((c) => `<th>${inline(c)}</th>`).join("") +
          "</tr></thead><tbody>" +
          rows
            .map(
              (r) =>
                "<tr>" +
                r.map((c) => `<td>${inline(c)}</td>`).join("") +
                "</tr>",
            )
            .join("") +
          "</tbody></table>",
      );
      continue;
    }
    const buf = [l];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !startsBlock(lines[i], lines[i + 1])
    )
      buf.push(lines[i++]);
    out.push(`<p>${inline(buf.join(" "))}</p>`);
  }
  return out.join("\n");
}
function md(src) {
  return blocks(esc(src.replace(/\r/g, "")).split("\n"));
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
  if (dirty && !confirm("Discard unsaved changes?")) return false;
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
    alert(e.message);
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
  let name = prompt(
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
    alert(e.message);
  }
};
$("newFolder").onclick = async () => {
  const ctx = ctxFolder(),
    what = $("newFolder").textContent.replace("New ", "");
  const name = prompt(
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
    alert(e.message);
  }
};
$("rename").onclick = async () => {
  const n = index.get(sel);
  if (!n) return;
  let to = prompt("New path (rename or move):", n.path);
  if (!to || to === n.path) return;
  if (!(await leaveEditor())) return;
  if (n.type === "page" && !/\.md$/i.test(to)) to += ".md";
  try {
    await api("POST", "/api/rename", { from: n.path, to });
    await refresh();
    await go(to);
  } catch (e) {
    alert(e.message);
  }
};
$("delete").onclick = async () => {
  const n = index.get(sel);
  if (!n) return;
  if (
    !confirm(
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
    alert(e.message);
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
$("save").onclick = () => save().catch((x) => alert(x.message));
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
    save().catch((x) => alert(x.message));
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
