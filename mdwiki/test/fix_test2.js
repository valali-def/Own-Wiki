const fs = require('fs');
let content = fs.readFileSync('c:\\Valentin - Personal - noOneDrive\\GutHub_Repositories\\Own-Wiki\\mdwiki\\test\\render.js', 'utf8');

// Move the test stub to after md function creation
// Find the test stub and remove it from before md function
const stubStart = content.indexOf('// Stub for resolveWikiLink');
const stubEnd = content.indexOf('const md=new Function');
const beforeStub = content.substring(0, stubStart);
const afterStub = content.substring(stubEnd);

// Insert the stub after md function creation
const mdFuncPos = afterStub.indexOf('const md=new Function');
const afterMdFunc = afterStub.substring(mdFuncPos + afterStub.substring(mdFuncPos).indexOf('\n') + 1);

const newContent = beforeStub + afterStub.substring(0, mdFuncPos + afterStub.substring(mdFuncPos).indexOf('\n') + 1) + 
  '\n// Override resolveWikiLink with test stub AFTER md function is created\n' +
  content.substring(stubStart, stubEnd).trim() + '\n\n' +
  afterMdFunc;

fs.writeFileSync('c:\\Valentin - Personal - noOneDrive\\GutHub_Repositories\\Own-Wiki\\mdwiki\\test\\render.js', newContent);
console.log('Done');