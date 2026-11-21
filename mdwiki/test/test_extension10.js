const marked = require('../public/vendor/marked.umd.js');

// Create a Marked instance and then modify its tokenizer
const MyMarked = new marked.Marked({
  gfm: true,
  renderer: {
    wikilink: function(token) {
      return '<span class="wikilink">' + token.text + '</span>';
    }
  }
});

// Check the lexer/tokenizer
console.log('lexer:', MyMarked.lexer);
console.log('lexer options:', MyMarked.lexer.options);
console.log('inline rules:', MyMarked.lexer.options.inline);

// Try to add a rule
MyMarked.lexer.options.inline.wikilink = /^\[\[([^\]]+)\]\]/;

console.log('after adding rule:', MyMarked.lexer.options.inline.wikilink);

// Try parsing
try {
  console.log(MyMarked.parse('Hello [[World]]'));
} catch (e) {
  console.log('Error:', e.message);
}