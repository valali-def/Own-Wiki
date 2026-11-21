const marked = require('../public/vendor/marked.umd.js');

// Try to understand the extension format by creating a minimal extension
// and seeing what marked.use does with it

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

// Let's see what happens when we call marked.use with this extension
try {
  marked.use({ extensions: [ext] });
  console.log('use succeeded');
  console.log('extensions:', JSON.stringify(marked.defaults.extensions, null, 2));
} catch (e) {
  console.log('use failed:', e.message);
}