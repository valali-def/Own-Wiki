const fs = require('fs');
let content = fs.readFileSync('c:\\Valentin - Personal - noOneDrive\\GutHub_Repositories\\Own-Wiki\\mdwiki\\test\\render.js', 'utf8');

const search1 = "const block=src.slice(src.indexOf('// ---- Markdown ----'),src.indexOf('// ---- end Markdown ----'));";
const replace1 = search1 + "\n\n// Define sel and index for the extracted block (used by wiki link extension)\nglobalThis.sel = \"\";\nglobalThis.index = new Map();";

const search2 = "const md=new Function('marked','esc',block+';return md;')(marked,esc);";
const replace2 = search2 + "\n\n// Override resolveWikiLink with test stub AFTER md function is created";

content = content.replace(search1, replace1);
content = content.replace(search2, replace2);

fs.writeFileSync('c:\\Valentin - Personal - noOneDrive\\GutHub_Repositories\\Own-Wiki\\mdwiki\\test\\render.js', content);
console.log('Done');