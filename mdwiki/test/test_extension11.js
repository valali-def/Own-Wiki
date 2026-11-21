const marked = require('../public/vendor/marked.umd.js');

// Use hooks to provide a custom lexer
const hooks = new marked.Hooks();

// Override provideLexer to add wiki link support
const originalLex = marked.lexer;
hooks.provideLexer = function(lexer) {
  // lexer is the lexer function
  return function(src, options) {
    const tokens = originalLex(src, options);
    // tokens is the result of lexing
    return tokens;
  };
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

console.log(MyMarked.parse('Hello [[World]]'));