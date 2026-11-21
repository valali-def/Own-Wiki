const marked = require('../public/vendor/marked.umd.js');

// Try using the hooks system
const hooks = new marked.Hooks();

// Add a preprocess hook to handle wiki links before parsing
hooks.add('preprocess', (markdown) => {
  // This runs before parsing, but would affect code blocks too - not good
  return markdown;
});

// Try to add an inline tokenizer via hooks
hooks.add('provideLexer', (lexer) => {
  return lexer;
});

const MyMarked = new marked.Marked({
  gfm: true,
  hooks: hooks
});

console.log(MyMarked.parse('Hello [[World]]'));