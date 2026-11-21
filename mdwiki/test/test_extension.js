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
  },
  renderer: {
    wikilink: function(token) {
      return '<span class="wikilink">' + token.text + '</span>';
    }
  }
};

marked.use({ extensions: [ext] });
console.log(marked.parse('Hello [[World]]'));
console.log(marked.parse('Hello `[[code]]` world'));
console.log(marked.parse('Hello [[Page|Label]] world'));