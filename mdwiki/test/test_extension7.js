const marked = require('../public/vendor/marked.umd.js');

// Try using the hooks system - check what methods it has
const hooks = new marked.Hooks();
console.log('hooks methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(hooks)));
console.log('hooks:', hooks);