const marked = require('../public/vendor/marked.umd.js');

const ext = {
  name: 'wikilink',
  level: 'inline',
  start: function(src) { return src.indexOf('[['); },
  tokenizer: function(src, tokens) {
    const match = src.match(/^\[\[([^\]]+)\]\]/);
    if (match) {
      return { type: 'wikilink', raw: match[0], text: match[1] };
    }
  }
};

marked.use({ extensions: [ext] });
console.log('extensions after use:', JSON.stringify(marked.defaults.extensions, null, 2));