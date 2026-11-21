const marked = require('../public/vendor/marked.umd.js');

// Try passing a custom tokenizer
const MyMarked = new marked.Marked({
  gfm: true,
  tokenizer: {
    inline: {
      wikilink: {
        name: 'wikilink',
        match: /^\[\[([^\]]+)\]\]/,
        parse: function(src, state) {
          const match = src.match(/^\[\[([^\]]+)\]\]/);
          if (match) {
            return {
              type: 'wikilink',
              raw: match[0],
              text: match[1]
            };
          }
        }
      }
    }
  },
  renderer: {
    wikilink: function(token) {
      return '<span class="wikilink">' + token.text + '</span>';
    }
  }
});

console.log(MyMarked.parse('Hello [[World]]'));
console.log(MyMarked.parse('Hello `[[code]]` world'));
console.log(MyMarked.parse('Hello [[Page|Label]] world'));