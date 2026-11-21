// can the vendored CM6 graph be imported in Node (DOM access is guarded at module level)?
const url = "file:///C:/Valentin%20-%20Personal%20-%20noOneDrive/GutHub_Repositories/Own-Wiki/mdwiki/public/cm-editor.js";
try {
  const m = await import(url);
  console.log("import ok, exports:", Object.keys(m).join(", "));
  console.log(typeof m.createEditor === "function" ? "createEditor present" : "FAIL createEditor missing");
} catch (e) {
  console.log("import failed:", e.message);
  process.exit(1);
}