const fs = require('fs');
let content = fs.readFileSync('c:\\Valentin - Personal - noOneDrive\\GutHub_Repositories\\Own-Wiki\\mdwiki\\test\\render.js', 'utf8');

// Replace the mustHave array for wiki link XSS tests
// Current: ['<img'] (unescaped) -> Should be: ['<img'] (escaped)
// The file uses HTML entities, so the escaped version is written as <img in the source code

content = content.replace(
  "['<img'],['<img']",
  "['<img'],['<img']"
);

fs.writeFileSync('c:\\Valentin - Personal - noOneDrive\\GutHub_Repositories\\Own-Wiki\\mdwiki\\test\\render.js', content);
console.log('Done');