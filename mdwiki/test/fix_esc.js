const fs = require('fs');
let content = fs.readFileSync('c:\\Valentin - Personal - noOneDrive\\GutHub_Repositories\\Own-Wiki\\mdwiki\\test\\render.js', 'utf8');
// The file currently has literal & < > " in the esc function
// We need to replace with HTML entity strings: & < > "
const oldEsc = "const esc=(s)=>String(s).replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/\\\"/g,'\"');";
const newEsc = "const esc=(s)=>String(s).replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/\\\"/g,'\"');";
content = content.replace(oldEsc, newEsc);
fs.writeFileSync('c:\\Valentin - Personal - noOneDrive\\GutHub_Repositories\\Own-Wiki\\mdwiki\\test\\render.js', content);
console.log('Done');