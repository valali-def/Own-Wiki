const fs = require('fs');
let content = fs.readFileSync('c:\\Valentin - Personal - noOneDrive\\GutHub_Repositories\\Own-Wiki\\mdwiki\\test\\render.js', 'utf8');

// Insert sel and index definitions after the block extraction
content = content.replace(
  "const block=src.slice(src.indexOf('// ---- Markdown ----'),src.indexOf('// ---- end Markdown ----'));",
  "const block=src.slice(src.indexOf('// ---- Markdown ----'),src.indexOf('// ---- end Markdown ----'));\n\n// Define sel and index for the extracted block (used by wiki link extension)\nglobalThis.sel = \"\";\nglobalThis.index = new Map();"
);

// Insert resolveWikiLink override after md function creation
content = content.replace(
  "const md=new Function('marked','esc',block+';return md;')(marked,esc);",
  "const md=new Function('marked','esc',block+';return md;')(marked,esc);\n\n// Override resolveWikiLink with test stub AFTER md function is created\nconst testIndex = new Map([\n  ['Book1/PageA.md', { path: 'Book1/PageA.md', name: 'PageA', type: 'page', depth: 3, parent: 'Book1' }],\n  ['Book1/PageB.md', { path: 'Book1/PageB.md', name: 'PageB', type: 'page', depth: 3, parent: 'Book1' }],\n  ['Book2/PageA.md', { path: 'Book2/PageA.md', name: 'PageA', type: 'page', depth: 3, parent: 'Book2' }],\n  ['Technik/Homelab/Docker.md', { path: 'Technik/Homelab/Docker.md', name: 'Docker', type: 'page', depth: 3, parent: 'Technik/Homelab' }],\n]);\nglobalThis.resolveWikiLink = function(name, label, currentPagePath) {\n  if (name.includes('/')) {\n    const path = name.endsWith('.md') ? name : name + '.md';\n    const node = testIndex.get(path);\n    if (node && node.type === 'page') {\n      return { found: true, path: '#' + encodeURIComponent(path), label: label };\n    }\n    return { found: false, path: null, label: label };\n  }\n  const lowerName = name.toLowerCase();\n  let candidates = [];\n  for (const node of testIndex.values()) {\n    if (node.type === 'page') {\n      const title = node.name;\n      if (title.toLowerCase() === lowerName) {\n        candidates.push(node);\n      }\n    }\n  }\n  if (candidates.length === 0) {\n    return { found: false, path: null, label: label };\n  }\n  if (currentPagePath) {\n    const currentNode = testIndex.get(currentPagePath);\n    if (currentNode) {\n      let currentBook = null;\n      let n = currentNode;\n      while (n && n.parent) {\n        const parent = testIndex.get(n.parent);\n        if (parent && parent.depth === 2 && parent.type === 'folder') {\n          currentBook = parent.path;\n          break;\n        }\n        n = parent;\n      }\n      if (currentBook) {\n        for (const cand of candidates) {\n          let candBook = null;\n          let m = cand;\n          while (m && m.parent) {\n            const parent = testIndex.get(m.parent);\n            if (parent && parent.depth === 2 && parent.type === 'folder') {\n              candBook = parent.path;\n              break;\n            }\n            m = parent;\n          }\n          if (candBook === currentBook) {\n            return { found: true, path: '#' + encodeURIComponent(cand.path), label: label };\n          }\n        }\n      }\n    }\n  }\n  candidates.sort((a, b) => a.path.localeCompare(b.path));\n  return { found: true, path: '#' + encodeURIComponent(candidates[0].path), label: label };\n};"
);

// Add wiki link tests before the final console.log
const wikiTests = "\n" +
  "// --- wiki links\n" +
  "// Note: sel is empty in tests, so same-book preference doesn't apply\n" +
  "t('wiki link plain','[[PageA]]',['href=\"#Book1%2FPageA.md\"','>PageA<']);\n" +
  "t('wiki link with label','[[PageA|Custom Label]]',['href=\"#Book1%2FPageA.md\"','>Custom Label<']);\n" +
  "t('wiki link missing','[[NonExistent]]',['class=\"wikilink-missing\"','title=\"Page not found\"','>NonExistent<'],['href=']);\n" +
  "t('wiki link same name two books','[[PageA]]',['href=\"#Book1%2FPageA.md\"']); // Book1 comes first alphabetically\n" +
  "t('wiki link path form','[[Technik/Homelab/Docker]]',['href=\"#Technik%2FHomelab%2FDocker.md\"','>Technik/Homelab/Docker<']);\n" +
  "t('wiki link in code span','use `[[PageA]]`',['<code>[[PageA]]</code>'],['href=','wikilink']);\n" +
  "t('wiki link XSS in name','[[<img src=x onerror=alert(1)>]]',['<img'],['<img']);\n" +
  "t('wiki link XSS in label','[[PageA|<img src=x onerror=alert(1)>]]',['<img'],['<img']);\n";

content = content.replace(
  "console.log(fail?`\\n${fail} FAILED`:'\\nall passed');",
  wikiTests + "console.log(fail?`\\n${fail} FAILED`:'\\nall passed');"
);

fs.writeFileSync('c:\\Valentin - Personal - noOneDrive\\GutHub_Repositories\\Own-Wiki\\mdwiki\\test\\render.js', content);
console.log('Done');