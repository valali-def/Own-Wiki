const fs = require('fs');
let content = fs.readFileSync('c:\\Valentin - Personal - noOneDrive\\GutHub_Repositories\\Own-Wiki\\mdwiki\\test\\render.js', 'utf8');

// The test expectations for wiki link XSS tests need to expect the escaped version in mustHave
// Current: ['<img'] (unescaped) -> Should be: ['<img'] (escaped, i.e., <img)
// But the file shows the entity as literal, so we need to replace the mustHave array

// The pattern is: t('wiki link XSS in name','[[<img src=x onerror=alert(1)>]]',['<img'],['<img']);
// We need to change the first array from ['<img'] to ['<img'] (where <img is the escaped version <img)

// In the actual file, the string '<img' appears as literal <img but we need <img
// The file content uses HTML entities, so the escaped version is written as <img in the source

content = content.replace(
  "['<img'],['<img']",
  "['<img'],['<img']"
);

fs.writeFileSync('c:\\Valentin - Personal - noOneDrive\\GutHub_Repositories\\Own-Wiki\\mdwiki\\test\\render.js', content);
console.log('Done');