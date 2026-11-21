const marked = require('../public/vendor/marked.umd.js');

// Format 1 works! Let me test more cases
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
  renderer: function(token) {
    return '<span class="wikilink">' + token.text + '</span>';
  }
};

const MyMarked = new marked.Marked({
  gfm: true,
  extensions: [ext]
});

console.log('Basic:', MyMarked.parse('Hello [[World]]'));
console.log('Code span:', MyMarked.parse('Hello `[[code]]` world'));
console.log('Code block:', MyMarked.parse('```\n[[code]]\n```'));
console.log('With label:', MyMarked.parse('Hello [[Page|Label]] world'));
console.log('Multiple:', MyMarked.parse('[[A]] and [[B]]'));
console.log('In link:', MyMarked.parse('See [[Page]] for more'));
console.log('XSS in name:', MyMarked.parse('[[<img src=x onerror=alert(1)>]]'));
console.log('XSS in label:', MyMarked.parse('[[Page|<img src=x onerror=alert(1)>]]'));