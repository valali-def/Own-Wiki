const marked = require('../public/vendor/marked.umd.js');

// Try using hooks.provideLexer to inject custom inline tokenization
const hooks = new marked.Hooks();

const originalLexInline = marked.lexer; // This might be the block lexer
console.log('marked.lexer:', typeof marked.lexer);
console.log('marked.parseInline:', typeof marked.parseInline);

// Check the Lexer class
const Lexer = marked.Lexer;
console.log('Lexer:', Lexer);
console.log('Lexer.lex:', typeof Lexer.lex);
console.log('Lexer.lexInline:', typeof Lexer.lexInline);

// Try to create a custom lexer
const customLexer = function(src, options) {
  // First run the default lexer
  const tokens = Lexer.lex(src, options);
  // Then process inline tokens for wiki links
  return tokens;
};

hooks.provideLexer = function() {
  return customLexer;
};

const MyMarked = new marked.Marked({
  gfm: true,
  hooks: hooks,
  renderer: {
    wikilink: function(token) {
      return '<span class="wikilink">' + token.text + '</span>';
    }
  }
});

try {
  console.log('Result:', MyMarked.parse('Hello [[World]]'));
} catch (e) {
  console.log('Error:', e.message);
}