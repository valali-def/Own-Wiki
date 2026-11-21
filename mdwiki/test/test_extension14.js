const marked = require('../public/vendor/marked.umd.js');

// Try using the tokenizer option with inline tokenizers
// Based on marked v18 documentation, the tokenizer option should be an object with inline tokenizers

const MyMarked = new marked.Marked({
  gfm: true,
  tokenizer: {
    inline: {
      wikilink: {
        name: 'wikilink',
        match: /^\[\[([^\]]+)\]\]/,
        parse: function(src, state, tokens) {
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

console.log('MyMarked options:', Object.keys(MyMarked.defaults));
console.log('tokenizer:', MyMarked.defaults.tokenizer);

try {
  console.log('Result:', MyMarked.parse('Hello [[World]]'));
  console.log('Result code:', MyMarked.parse('Hello `[[code]]` world'));
  console.log('Result label:', MyMarked.parse('Hello [[Page|Label]] world'));
} catch (e) {
  console.log('Error:', e.message);
  console.log(e.stack);
}