// Run: node test/render.js   (tests md() from public/app.js: Markdown features + XSS attempts)
const fs=require('fs');
const marked=require(require('path').join(__dirname,'..','public','vendor','marked.umd.js'));
globalThis.marked=marked;
const src=fs.readFileSync(require('path').join(__dirname,'..','public','app.js'),'utf8').replace(/\r/g,'');
const esc=(s)=>String(s).replace(/&/g,'\u0026amp;').replace(/</g,'\u0026lt;').replace(/>/g,'\u0026gt;').replace(/"/g,'\u0026quot;');
const block=src.slice(src.indexOf('// ---- Markdown ----'),src.indexOf('// ---- end Markdown ----'));
const md=new Function('marked','esc',block+';return md;')(marked,esc);
let fail=0;
const t=(name,input,mustHave=[],mustNot=[])=>{
  const out=md(input);
  const bad=[...mustHave.filter(x=>!out.includes(x)).map(x=>'missing '+x),...mustNot.filter(x=>out.toLowerCase().includes(x)).map(x=>'forbidden '+x)];
  console.log(bad.length?'FAIL':'ok  ',name,bad.length?'\n   '+bad.join('\n   ')+'\n   OUT: '+out.replace(/\n/g,'\\n'):'');
  if(bad.length)fail++;
};
// --- security
t('script tag','<script>alert(1)</script>',['\u0026lt;script\u0026gt;'],['<script']);
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

// ---- wiki link tests (use the REAL resolveWikiLink from app.js) ----
globalThis.index = new Map([
  ['Book1',               { path:'Book1',                name:'Book1',       type:'folder', depth:2, parent:'' }],
  ['Book2',               { path:'Book2',                name:'Book2',       type:'folder', depth:2, parent:'' }],
  ['Book1/PageA.md',      { path:'Book1/PageA.md',       name:'PageA',       type:'page',   depth:3, parent:'Book1' }],
  ['Book2/PageA.md',      { path:'Book2/PageA.md',       name:'PageA',       type:'page',   depth:3, parent:'Book2' }],
  ['Book2/PageB.md',      { path:'Book2/PageB.md',       name:'PageB',       type:'page',   depth:3, parent:'Book2' }],
  ['Technik',             { path:'Technik',              name:'Technik',     type:'folder', depth:2, parent:'' }],
  ['Technik/Homelab',     { path:'Technik/Homelab',      name:'Homelab',     type:'folder', depth:3, parent:'Technik' }],
  ['Technik/Homelab/Docker.md', { path:'Technik/Homelab/Docker.md', name:'Docker', type:'page', depth:4, parent:'Technik/Homelab' }],
]);

globalThis.sel = '';
// plain link: [[PageA]] → resolves to first by path (Book1/PageA.md)
t('wiki plain','[[PageA]]',['data-p="Book1/PageA.md"','href="#Book1%2FPageA.md"'],['wikilink-missing']);
// link with label: [[PageA|My Label]]
t('wiki label','[[PageA|My Label]]',['data-p="Book1/PageA.md"','>My Label<'],['wikilink-missing']);
// missing page
t('wiki missing','[[Nope]]',['wikilink-missing'],['href="#']);
// same title in two books, sel empty → first by path
t('wiki two books','[[PageA]]',['data-p="Book1/PageA.md"'],['Book2']);
// path form [[Technik/Homelab/Docker]]
t('wiki path form','[[Technik/Homelab/Docker]]',['data-p="Technik/Homelab/Docker.md"'],['wikilink-missing']);
// link inside a code span stays literal
t('wiki code span','text `[[PageA]]` more',['<code>[[PageA]]</code>'],['href="#']);
// XSS in name: [[<img src=x onerror=alert(1)>]]
t('wiki xss name','[['+'<img src=x onerror=alert(1)>'+']]',['\u0026lt;img src=x onerror=alert(1)\u0026gt;'],['<img src=x']);
// XSS in label: [[PageA|<img src=x onerror=alert(1)>]]
t('wiki xss label','[[PageA|'+'<img src=x onerror=alert(1)>' +']]',['\u0026lt;img'],['<img']);
// same-book preference: sel is a page in Book2 → [[PageA]] resolves to Book2/PageA.md
globalThis.sel = 'Book2/PageB.md';
t('wiki same book','[[PageA]]',['data-p="Book2/PageA.md"'],['Book1/PageA']);
// spaces [[ PageA | Label ]] are trimmed
globalThis.sel = '';
t('wiki spaces','[[ PageA | My Label ]]',['data-p="Book1/PageA.md"','>My Label<'],['wikilink-missing']);
// data-p is DECODED (no %2F); the href keeps %2F on purpose
t('wiki data-p decoded','[[PageA]]',['data-p="Book1/PageA.md"'],['data-p="Book1%2F']);

console.log(fail?`\n${fail} FAILED`:'\nall passed');
process.exit(fail?1:0);
