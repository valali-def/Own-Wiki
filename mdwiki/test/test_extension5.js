const marked = require('../public/vendor/marked.umd.js');

// Try to understand the extension format by looking at how marked.parseInline works
console.log('parseInline:', typeof marked.parseInline);

// Try using marked.Marked with custom tokenizer
const MyMarked = new marked.Marked({
  gfm: true,
  tokenizer: {
    inline: {
      // Try to override the inline tokenizer
    }
  }
});

console.log('MyMarked:', typeof MyMarked.parse);