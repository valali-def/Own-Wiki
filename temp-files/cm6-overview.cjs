const fs = require("fs"), path = require("path");
const p = "c:\\Valentin - Personal - noOneDrive\\GutHub_Repositories\\Own-Wiki\\mdwiki\\public\\vendor\\cm6";
function walk(d, out = []) {
  for (const f of fs.readdirSync(d)) {
    const fp = path.join(d, f);
    if (fs.statSync(fp).isDirectory()) walk(fp, out);
    else if (fp.endsWith(".js")) out.push(fp);
  }
  return out;
}
for (const f of walk(p)) {
  const c = fs.readFileSync(f, "utf8");
  const imps = [...c.matchAll(/from"(\.[^"]+)"/g)].map((m) => m[1]);
  const exp = (c.match(/export\{([^}]*)\}/) || [])[1] || "";
  console.log(path.relative(p, f), "| imports:", imps.join(", ") || "-", "| exports:", exp.slice(0, 300));
}