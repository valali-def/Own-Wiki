const fs = require("fs"), path = require("path");
const p = "c:\\Valentin - Personal - noOneDrive\\GutHub_Repositories\\Own-Wiki\\mdwiki\\public\\vendor\\cm6";
const want = {
  "@codemirror/commands.js": ["defaultKeymap", "history", "historyKeymap", "indentWithTab", "undo", "redo"],
  "@codemirror/view.js": ["EditorView", "keymap", "highlightActiveLine"],
  "@codemirror/language.js": ["syntaxHighlighting", "HighlightStyle", "bracketMatching"],
  "@codemirror/lang-markdown.js": ["markdown", "markdownLanguage", "markdownKeymap"],
  "@codemirror/state.js": ["EditorState", "Compartment"],
  "@lezer/highlight.js": ["tags"],
};
let fail = 0;
for (const [f, names] of Object.entries(want)) {
  const c = fs.readFileSync(path.join(p, f), "utf8");
  const exp = (c.match(/export\{([^}]*)\}/) || [])[1] || "";
  const exported = new Set([...exp.matchAll(/(\w+) as (\w+)|(\w+)(?=,|$)/g)].map((m) => m[2] || m[1] || m[3]));
  for (const n of names) {
    const ok = exported.has(n);
    if (!ok) fail++;
    console.log((ok ? "ok   " : "FAIL ") + f + " exports " + n);
  }
}
// check the tags we plan to use exist in @lezer/highlight
const hl = fs.readFileSync(path.join(p, "@lezer/highlight.js"), "utf8");
const tagsBlock = (hl.match(/tags[= ]/g) || []).length;
for (const t of ["heading", "emphasis", "strong", "strikethrough", "link", "url", "quote", "monospace", "comment", "processingInstruction", "atom", "number", "string", "keyword", "punctuation", "invalid", "escape", "meta", "labelName"]) {
  const ok = new RegExp("\\b" + t + "\\s*:").test(hl);
  if (!ok) fail++;
  console.log((ok ? "ok   " : "FAIL ") + "tags." + t);
}
console.log(fail ? fail + " FAILED" : "all exports present");
process.exit(fail ? 1 : 0);