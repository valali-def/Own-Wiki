const marked = require('../public/vendor/marked.umd.js');

// Try passing extensions directly to Marked constructor
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

const MyMarked = new marked.Marked({
  gfm: true,
  extensions: [ext]
});

console.log('MyMarked options extensions:', JSON.stringify(MyMarked.defaults.extensions, null, 2));

try {
  console.log('Result:', MyMarked.parse('Hello [[World]]'));
  console.log('Result code:', MyMarked.parse('Hello `[[code]]` world'));
  console.log('Result label:', MyMarked.parse('Hello [[Page|Label]] world'));
} catch (e) {
  console.log('Error:', e.message);
}