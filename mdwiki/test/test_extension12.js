const marked = require('../public/vendor/marked.umd.js');

// Let's trace what marked.use does
const originalUse = marked.use;
marked.use = function(...args) {
  console.log('marked.use called with:', JSON.stringify(args, null, 2));
  return originalUse.apply(this, args);
};

// Try the extension format from marked documentation
// According to marked v18 docs, extensions should have:
// - name: string
// - level: 'block' | 'inline' | 'block-inline'
// - start: (src) => number
// - tokenizer: (src, tokens) => Token | undefined
// - renderer: { tokenType: (token) => string }

const ext = {
  name: 'wikilink',
  level: 'inline',
  start: function(src) { return src.indexOf('[['); },
  tokenizer: function(src, tokens) {
    const match = src.match(/^\[\[([^\]]+)\]\]/);
    if (match) {
      return { type: 'wikilink', raw: match[0], text: match[1] };
    }
  },
  renderer: {
    wikilink: function(token) {
      return '<span class="wikilink">' + token.text + '</span>';
    }
  }
};

marked.use({ extensions: [ext] });
console.log('extensions after use:', JSON.stringify(marked.defaults.extensions, null, 2));

// Now create a Marked instance
const MyMarked = new marked.Marked({
  gfm: true
});

console.log('MyMarked options extensions:', JSON.stringify(MyMarked.defaults.extensions, null, 2));

try {
  console.log('Result:', MyMarked.parse('Hello [[World]]'));
} catch (e) {
  console.log('Error:', e.message);
}