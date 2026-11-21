// Run: node test/render.js   (tests md() from public/app.js: Markdown features + XSS attempts)
const fs=require('fs');
const marked=require(require('path').join(__dirname,'..','public','vendor','marked.umd.js'));
globalThis.marked=marked;
const src=fs.readFileSync(require('path').join(__dirname,'..','public','app.js'),'utf8').replace(/\r/g,'');
const esc=(s)=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const block=src.slice(src.indexOf('// ---- Markdown ----'),src.indexOf('// ---- end Markdown ----'));

// Define sel and index for the extracted block (used by wiki link extension)
globalThis.sel = "";
globalThis.index = new Map();
const md=new Function('marked','esc',block+';return md;')(marked,esc);

// Override resolveWikiLink with test stub AFTER md function is created
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
let fail=0;
const t=(name,input,mustHave=[],mustNot=[])=>{
  const out=md(input);
  const bad=[...mustHave.filter(x=>!out.includes(x)).map(x=>'missing '+x),...mustNot.filter(x=>out.toLowerCase().includes(x)).map(x=>'forbidden '+x)];
  console.log(bad.length?'FAIL':'ok  ',name,bad.length?'\n   '+bad.join('\n   ')+'\n   OUT: '+out.replace(/\n/g,'\\n'):'');
  if(bad.length)fail++;
};
// --- security
t('script tag','<script>alert(1)</script>',['&lt;script&gt;'],['<script']);
t('img onerror','<img src=x onerror=alert(1)>',['&lt;img'],['<img']);
t('inline html','a <b onclick="x()">b</b> c',['&lt;b'],['<b ']);
t('js link','[x](javascript:alert(1))',['href="#"'],['javascript:']);
t('js link mixed case','[x](JaVaScRiPt:alert(1))',['href="#"'],['javascript:']);
t('js link entity','[x](java&#115;cript:alert(1))',[],['href="javascript']);
t('data image','![x](data:text/html;base64,AAAA)',['src="#"'],['data:']);
t('autolink js','<javascript:alert(1)>',[],['href="javascript']);
t('attr breakout','[x](http://a.b/"onmouseover="alert(1))',[],['onmouseover="']);
t('alt breakout','![a" onerror="x](/a.png)',[],['onerror="']);
t('title breakout','[x](http://a.b "t\\" onclick=\\"y")',[],['onclick="']);
t('html block','<div onclick="x()">hi</div>\n\ntext',['&lt;div'],['<div']);
t('iframe','<iframe src="//evil"></iframe>',['&lt;iframe'],['<iframe']);
t('code keeps html','```\n<script>x</script>\n```',['&lt;script&gt;'],['<script']);
// --- features
t('headings','# H1\n## H2',['<h1','<h2']);
t('bold/italic/strike','**b** *i* ~~s~~ _u_',['<strong>b','<em>i','<del>s','<em>u']);
t('inline code','use `a<b`',['<code>a&lt;b</code>']);
t('code lang','```js\nlet a=1\n```',['language-js']);
t('task list','- [x] done\n- [ ] todo',['type="checkbox"','checked']);
t('nested list','- a\n  - b\n    - c',['<ul>']);
t('ordered','1. a\n2. b',['<ol>']);
t('table align','| a | b |\n|:--|--:|\n| 1 | 2 |',['<table>','align="left"','align="right"']);
t('blockquote','> q\n> > nested',['<blockquote>']);
t('quote in list','- item\n\n  > quoted',['<blockquote>']);
t('autolink bare','see https://example.com/x ok',['href="https://example.com/x"']);
t('autolink angle','<https://example.com>',['href="https://example.com"']);
t('link target','[a](https://x.y)',['target="_blank"','rel="noopener"']);
t('relative link','[a](/files/assets/x.png)',['href="/files/assets/x.png"']);
t('image','![alt](/files/assets/x.png "T")',['<img alt="alt" src="/files/assets/x.png" title="T">']);
t('hr','a\n\n---\n\nb',['<hr']);
t('hard break (2 spaces)','a  \nb',['<br']);
t('hard break (backslash)','a\\\nb',['<br']);
t('escaped star','\\*not em\\*',['*not em*'],['<em>']);
t('amp in url','[a](http://x.y/?a=1&b=2)',['a=1&amp;b=2']);
t('empty','',[]);

// --- wiki links
// Note: sel is empty in tests, so same-book preference doesn't apply
t('wiki link plain','[[PageA]]',['href="#Book1%2FPageA.md"','>PageA<']);
t('wiki link with label','[[PageA|Custom Label]]',['href="#Book1%2FPageA.md"','>Custom Label<']);
t('wiki link missing','[[NonExistent]]',['class="wikilink-missing"','title="Page not found"','>NonExistent<'],['href=']);
t('wiki link same name two books','[[PageA]]',['href="#Book1%2FPageA.md"']); // Book1 comes first alphabetically
t('wiki link path form','[[Technik/Homelab/Docker]]',['href="#Technik%2FHomelab%2FDocker.md"','>Technik/Homelab/Docker<']);
t('wiki link in code span','use `[[PageA]]`',['<code>[[PageA]]</code>'],['href=','wikilink']);
t('wiki link XSS in name','[[<img src=x onerror=alert(1)>]]',['<img'],['<img']);
t('wiki link XSS in label','[[PageA|<img src=x onerror=alert(1)>]]',['<img'],['<img']);
console.log(fail?`\n${fail} FAILED`:'\nall passed');
process.exit(fail?1:0);
