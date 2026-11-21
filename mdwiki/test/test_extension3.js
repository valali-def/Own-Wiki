const marked = require('../public/vendor/marked.umd.js');

// Try using hooks
const hooks = new marked.Hooks();
console.log('hooks:', Object.keys(hooks));
console.log('hooks.block:', Object.keys(hooks.block || {}));