const marked = require('../public/vendor/marked.umd.js');

// Try different extension formats

// Format 1: renderer as a function
const ext1 = {
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

// Format 2: renderer as object with token type
const ext2 = {
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

// Format 3: no renderer in extension, use Marked renderer option
const ext3 = {
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

console.log('Testing format 1 (renderer as function):');
try {
  const MyMarked1 = new marked.Marked({
    gfm: true,
    extensions: [ext1]
  });
  console.log('  extensions:', JSON.stringify(MyMarked1.defaults.extensions, null, 2));
  console.log('  Result:', MyMarked1.parse('Hello [[World]]'));
} catch (e) {
  console.log('  Error:', e.message);
}

console.log('\nTesting format 2 (renderer as object):');
try {
  const MyMarked2 = new marked.Marked({
    gfm: true,
    extensions: [ext2]
  });
  console.log('  extensions:', JSON.stringify(MyMarked2.defaults.extensions, null, 2));
  console.log('  Result:', MyMarked2.parse('Hello [[World]]'));
} catch (e) {
  console.log('  Error:', e.message);
}

console.log('\nTesting format 3 (no renderer in extension, use Marked renderer option):');
try {
  const MyMarked3 = new marked.Marked({
    gfm: true,
    extensions: [ext3],
    renderer: {
      wikilink: function(token) {
        return '<span class="wikilink">' + token.text + '</span>';
      }
    }
  });
  console.log('  extensions:', JSON.stringify(MyMarked3.defaults.extensions, null, 2));
  console.log('  Result:', MyMarked3.parse('Hello [[World]]'));
} catch (e) {
  console.log('  Error:', e.message);
}