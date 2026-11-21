// Downloads CodeMirror 6 (and its dependencies) as ES modules from jsDelivr,
// rewrites all jsDelivr URLs to local relative paths and stores everything in
// public/vendor/cm6/, so the editor works fully offline.
//
// Run:  node tools/fetch-cm6.mjs     (from the mdwiki/ folder)
import { mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, copyFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import os from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "vendor", "cm6");
const LIC = join(OUT, "LICENSES");
rmSync(OUT, { recursive: true, force: true });

const ENTRIES = [
  "https://cdn.jsdelivr.net/npm/@codemirror/state@6/+esm",
  "https://cdn.jsdelivr.net/npm/@codemirror/view@6/+esm",
  "https://cdn.jsdelivr.net/npm/@codemirror/commands@6/+esm",
  "https://cdn.jsdelivr.net/npm/@codemirror/language@6/+esm",
  "https://cdn.jsdelivr.net/npm/@codemirror/lang-markdown@6/+esm",
];

const DEP_RE = /"(\/npm\/[^"]+\/\+esm)"/g;
// "/npm/@codemirror/state@6.7.6/+esm" -> { pkg, version, local, url }
function parseDep(dep) {
  const m = dep.match(/^\/npm\/(.+)@([^@/]+)\/\+esm$/);
  if (!m) throw new Error("unexpected dep URL: " + dep);
  // flat local name, so that "./name.js" resolves correctly from every vendored file
  return { pkg: m[1], version: m[2], local: m[1].replace(/\//g, "__") + ".js", url: "https://cdn.jsdelivr.net" + dep };
}

const seen = new Map(); // pkg -> {version, local}
const queue = [...ENTRIES];
const manifest = [];

while (queue.length) {
  const url = queue.shift();
  const info = parseDep(url.replace("https://cdn.jsdelivr.net", ""));
  if (seen.has(info.pkg)) {
    if (seen.get(info.pkg).version !== info.version)
      console.warn(`version conflict for ${info.pkg}: ${seen.get(info.pkg).version} vs ${info.version} (keeping first)`);
    continue;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed ${res.status} ${url}`);
  let code = await res.text();
  seen.set(info.pkg, { version: info.version, local: info.local });
  manifest.push(`${info.pkg}@${info.version}`);

  // collect + rewrite dependency imports to local relative paths
  const deps = new Set();
  for (const m of code.matchAll(DEP_RE)) deps.add(m[1]);
  for (const dep of deps) {
    const d = parseDep(dep);
    code = code.split(`"${dep}"`).join(`"./${d.local}"`);
    queue.push(d.url);
  }
  // drop the sourceMappingURL comment (points at a remote map we don't ship)
  code = code.replace(/\n\/\/# sourceMappingURL=.*\n?/, "\n");

  const file = join(OUT, info.local);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, code);

  // licence
  try {
    const lic = await fetch(`https://cdn.jsdelivr.net/npm/${info.pkg}@${info.version}/LICENSE`);
    if (lic.ok) {
      mkdirSync(LIC, { recursive: true });
      writeFileSync(join(LIC, info.pkg.replace(/\//g, "__") + ".txt"), await lic.text());
    }
  } catch {}
  console.log("saved", info.local, `(${info.pkg}@${info.version}, ${code.length} bytes)`);
}

// verify: no external jsDelivr references left, every file parses as ESM
function walk(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith(".js")) out.push(p);
  }
  return out;
}
let fail = 0;
for (const f of walk(OUT)) {
  const code = readFileSync(f, "utf8");
  if (code.includes('"/npm/') || code.includes("cdn.jsdelivr.net")) {
    console.error("FAIL external URL left in", f);
    fail++;
  }
  const tmp = join(os.tmpdir(), "cm6check" + Math.random().toString(36).slice(2) + ".mjs");
  copyFileSync(f, tmp);
  try {
    execFileSync(process.execPath, ["--check", tmp], { stdio: "pipe" });
  } catch (e) {
    console.error("FAIL syntax error in", f, "\n", String(e.stderr));
    fail++;
  }
  rmSync(tmp, { force: true });
}

writeFileSync(
  join(OUT, "VERSIONS.txt"),
  "Vendored CodeMirror 6 packages (ESM, from jsDelivr, imports rewritten to local paths):\n" +
    manifest.sort().join("\n") +
    "\n\nLicences: see LICENSES/\nRegenerate: node tools/fetch-cm6.mjs\n",
);
console.log(fail ? `\n${fail} FAILED` : `\nall ${manifest.length} packages vendored and syntax-checked`);
process.exit(fail ? 1 : 0);