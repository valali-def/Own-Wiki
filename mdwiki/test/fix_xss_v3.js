const fs = require('fs');
let content = fs.readFileSync('c:\\Valentin - Personal - noOneDrive\\GutHub_Repositories\\Own-Wiki\\mdwiki\\test\\render.js', 'utf8');

// The test expectations for wiki link XSS tests need to expect the escaped version in mustHave
// Current mustHave: ['<img'] (literal <img) -> Should be: ['<img'] (escaped, i.e., <img)
// In JavaScript source, the escaped version is written as '<img' (which is the string <img)

// Find the line: t('wiki link XSS in name','[[<img src=x onerror=alert(1)>]]',['<img'],['<img']);
// And change the first array from ['<img'] to ['<img']

content = content.replace(
  "['<img'],['<img']",
  "['<img'],['<img']"
);

fs.writeFileSync('c:\\Valentin - Personal - noOneDrive\\GutHub_Repositories\\Own-Wiki\\mdwiki\\test\\render.js', content);
console.log('Done');