const marked = require('../public/vendor/marked.umd.js');

// Check the Tokenizer
const tokenizer = new marked.Tokenizer({});
console.log('Tokenizer:', Object.keys(tokenizer));
console.log('inline:', Object.keys(tokenizer.inline || {}));
console.log('inlineTokens:', tokenizer.inlineTokens);