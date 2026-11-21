const fs = require('fs');
let content = fs.readFileSync('c:\\Valentin - Personal - noOneDrive\\GutHub_Repositories\\Own-Wiki\\mdwiki\\test\\render.js', 'utf8');

// Replace the first '<img' in each XSS test line with '<img' (escaped version)
// The lines look like: t('wiki link XSS in name','[[<img src=x onerror=alert(1)>]]',['<img'],['<img']);
// We need to change the first '<img' (in the mustHave array) to '<img' (escaped)

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