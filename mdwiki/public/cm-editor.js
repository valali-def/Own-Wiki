// CodeMirror 6 editor for the wiki.
// All CM6 packages are vendored locally in vendor/cm6/ (see tools/fetch-cm6.mjs),
// all imports rewritten to local paths, so this works fully offline.
// app.js loads this module dynamically; if anything fails, it falls back to the plain <textarea>.
import { EditorView, keymap, highlightActiveLine } from "./vendor/cm6/@codemirror__view.js";
import { EditorState, Compartment, EditorSelection } from "./vendor/cm6/@codemirror__state.js";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "./vendor/cm6/@codemirror__commands.js";
import { markdown, markdownLanguage } from "./vendor/cm6/@codemirror__lang-markdown.js";
import { syntaxHighlighting, HighlightStyle, bracketMatching } from "./vendor/cm6/@codemirror__language.js";
import { tags as t } from "./vendor/cm6/@lezer__highlight.js";

// Creates a Markdown editor inside `host`.
// opts.value     initial text
// opts.onUpdate  called with the full text on every change
// opts.onCommand called as onCommand(name, view) for Mod-b / Mod-i / Mod-k / Mod-s; return true if handled
export function createEditor(host, { value = "", onUpdate, onCommand } = {}) {
  const editable = new Compartment();
  const run = (name) => (view) => (onCommand ? onCommand(name, view) : false) || false;

  // All colors come from the CSS variables of style.css, so light and dark theme both work.
  const theme = EditorView.theme(
    {
      "&": { backgroundColor: "var(--panel)", color: "var(--fg)" },
      ".cm-content": { caretColor: "var(--fg)" },
      ".cm-gutters": { backgroundColor: "var(--panel)", color: "var(--muted)", border: "none" },
    },
    { dark: document.documentElement.dataset.theme === "dark" },
  );
  const highlight = HighlightStyle.define([
    { tag: t.heading, color: "var(--head)", fontWeight: "bold" },
    { tag: t.emphasis, fontStyle: "italic" },
    { tag: t.strong, fontWeight: "bold" },
    { tag: t.strikethrough, textDecoration: "line-through" },
    { tag: t.link, color: "var(--accent)", textDecoration: "underline" },
    { tag: t.url, color: "var(--accent)" },
    { tag: t.quote, color: "var(--muted)", fontStyle: "italic" },
    { tag: t.monospace, color: "var(--c-chapter)" },
    { tag: t.processingInstruction, color: "var(--muted)" },
    { tag: t.comment, color: "var(--muted)", fontStyle: "italic" },
    { tag: t.atom, color: "var(--c-shelf)" },
    { tag: t.number, color: "var(--c-shelf)" },
    { tag: t.string, color: "var(--c-page)" },
    { tag: t.keyword, color: "var(--c-book)" },
    { tag: t.punctuation, color: "var(--muted)" },
    { tag: t.invalid, color: "var(--danger)" },
  ]);

  const view = new EditorView({
    parent: host,
    state: EditorState.create({
      doc: value,
      extensions: [
        keymap.of([
          { key: "Mod-b", run: run("bold") },
          { key: "Mod-i", run: run("italic") },
          { key: "Mod-k", run: run("link") },
          { key: "Mod-s", run: run("save") },
          indentWithTab,
        ]),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        markdown({ base: markdownLanguage }),
        syntaxHighlighting(highlight),
        bracketMatching(),
        highlightActiveLine(),
        editable.of(EditorView.editable.of(true)),
        EditorView.lineWrapping,
        EditorView.updateListener.of((u) => {
          if (u.docChanged && onUpdate) onUpdate(u.state.doc.toString());
        }),
        theme,
      ],
    }),
  });

  return {
    view,
    getValue: () => view.state.doc.toString(),
    setValue: (v) =>
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: String(v) } }),
    focus: () => view.focus(),
    setDisabled: (d) =>
      view.dispatch({ effects: editable.reconfigure(EditorView.editable.of(!d)) }),
  };
}

export { EditorSelection };