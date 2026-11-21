const fs = require('fs');
let content = fs.readFileSync('c:\\Valentin - Personal - noOneDrive\\GutHub_Repositories\\Own-Wiki\\mdwiki\\test\\render.js', 'utf8');

// Fix the wiki link XSS test expectations
// The mustHave should expect the escaped version '<img' not the literal '<img'

// Line 131: t('wiki link XSS in name','[[<img src=x onerror=alert(1)>]]',['<img'],['<img']);
// Change the first array from ['<img'] to ['<img']

content = content.replace(
  "t('wiki link XSS in name','[[<img src=x onerror=alert(1)>]]',['<img'],['<img']);",
  "t('wiki link XSS in name','[[<img src=x onerror=alert(1)>]]',['<img'],['<img']);"
);

content = content.replace(
  "t('wiki link XSS in label','[[PageA|<img src=x onerror=alert(1)>]]',['<img'],['<img']);",
  "t('wiki link XSS in label','[[PageA|<img src=x onerror=alert(1)>]]',['<img'],['<img']);"
);

fs.writeFileSync('c:\\Valentin - Personal - noOneDrive\\GutHub_Repositories\\Own-Wiki\\mdwiki\\test\\render.js', content);
console.log('Done');