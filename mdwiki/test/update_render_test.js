const fs = require('fs');
const part1 = `// Run: node test/render.js   (tests md() from public/app.js: Markdown features + XSS attempts)
const fs=require('fs');
const marked=require(require('path').join(__dirname,'..','public','vendor','marked.umd.js'));
globalThis.marked=marked;
const src=fs.readFileSync(require('path').join(__dirname,'..','public','app.js'),'utf8').replace(/\\r/g,'');
const esc=(s)=>String(s).replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'"');
const block=src.slice(src.indexOf('// ---- Markdown ----'),src.indexOf('// ---- end Markdown ----'));

// Stub for resolveWikiLink - simulates a page index for testing
const testIndex = new Map([
  ['Book1/PageA.md', { path: 'Book1/PageA.md', name: 'PageA', type: 'page', depth: 3, parent: 'Book1' }],
  ['Book1/PageB.md', { path: 'Book1/PageB.md', name: 'PageB', type: 'page', depth: 3, parent: 'Book1' }],
  ['Book2/PageA.md', { path: 'Book2/PageA.md', name: 'PageA', type: 'page', depth: 3, parent: 'Book2' }],
  ['Technik/Homelab/Docker.md', { path: 'Technik/Homelab/Docker.md', name: 'Docker', type: 'page', depth: 3, parent: 'Technik/Homelab' }],
]);
globalThis.resolveWikiLink = function(name, label, currentPagePath) {
  if (name.includes('/')) {
    const path = name.endsWith('.md') ? name : name + '.md';
    const node = testIndex.get(path);
    if (node && node.type === 'page') {
      return { found: true, path: '#' + encodeURIComponent(path), label: label };
    }
    return { found: false, path: null, label: label };
  }
  const lowerName = name.toLowerCase();
  let candidates = [];
  for (const node of testIndex.values()) {
    if (node.type === 'page') {
      const title = node.name;
      if (title.toLowerCase() === lowerName) {
        candidates.push(node);
      }
    }
  }
  if (candidates.length === 0) {
    return { found: false, path: null, label: label };
  }
  if (currentPagePath) {
    const currentNode = testIndex.get(currentPagePath);
    if (currentNode) {
      let currentBook = null;
      let n = currentNode;
      while (n && n.parent) {
        const parent = testIndex.get(n.parent);
        if (parent && parent.depth === 2 && parent.type === 'folder') {
          currentBook = parent.path;
          break;
        }
        n = parent;
      }
      if (currentBook) {
        for (const cand of candidates) {
          let candBook = null;
          let m = cand;
          while (m && m.parent) {
            const parent = testIndex.get(m.parent);
            if (parent && parent.depth === 2 && parent.type === 'folder') {
              candBook = parent.path;
              break;
            }
            m = parent;
          }
          if (candBook === currentBook) {
            return { found: true, path: '#' + encodeURIComponent(cand.path), label: label };
          }
        }
      }
    }
  }
  candidates.sort((a, b) => a.path.localeCompare(b.path));
  return { found: true, path: '#' + encodeURIComponent(candidates[0].path), label: label };
};

const md=new Function('marked','esc',block+';return md;')(marked,esc);
let fail=0;
const t=(name,input,mustHave=[],mustNot=[])=>{
  const out=md(input);
  const bad=[...mustHave.filter(x=>!out.includes(x)).map(x=>'missing '+x),...mustNot.filter(x=>out.toLowerCase().includes(x)).map(x=>'forbidden '+x)];
  console.log(bad.length?'FAIL':'ok  ',name,bad.length?'\\n   '+bad.join('\\n   ')+'\\n   OUT: '+out.replace(/\\n/g,'\\\\n'):'');
  if(bad.length)fail++;
};
`;
fs.writeFileSync('c:\\Valentin - Personal - noOneDrive\\GutHub_Repositories\\Own-Wiki\\mdwiki\\test\\render.js', part1);
console.log('Part 1 done');