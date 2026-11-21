const marked = require('../public/vendor/marked.umd.js');

// Global resolver function (injectable for testing)
globalThis.resolveWikiLink = function(name, label, currentPagePath) {
  // Stub for testing - in app.js this will be replaced with real resolver
  return { found: false, path: null, label: label || name };
};

// HTML escape function - CORRECTED
function esc(s) {
  return String(s)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}

const ext = {
  name: 'wikilink',
  level: 'inline',
  start: function(src) { return src.indexOf('[['); },
  tokenizer: function(src, tokens) {
    // Match [[name]] or [[name|label]]
    const match = src.match(/^\[\[([^\]]+)\]\]/);
    if (match) {
      const content = match[1];
      // Split on | for label
      const parts = content.split('|');
      const name = parts[0];
      const label = parts[1] || name;
      return { 
        type: 'wikilink', 
        raw: match[0], 
        name: name,
        label: label
      };
    }
  },
  renderer: function(token) {
    // Use the global resolver
    const resolved = globalThis.resolveWikiLink(token.name, token.label, '');
    const safeName = esc(token.name);
    const safeLabel = esc(token.label);
    
    if (resolved.found) {
      // Found: render as link
      const safeHref = esc(resolved.path); // href should be safeUrl'd
      return `<a href="${safeHref}">${safeLabel}</a>`;
    } else {
      // Not found: render as span with missing class
      return `<span class="wikilink-missing" title="Page not found">${safeLabel}</span>`;
    }
  }
};

const MyMarked = new marked.Marked({
  gfm: true,
  extensions: [ext]
});

console.log('XSS in name:', MyMarked.parse('[[<img src=x onerror=alert(1)>]]'));
console.log('XSS in label:', MyMarked.parse('[[Page|<img src=x onerror=alert(1)>]]'));

// Test with a resolver that finds pages
globalThis.resolveWikiLink = function(name, label, currentPagePath) {
  if (name === 'ExistingPage') {
    return { found: true, path: '#ExistingPage.md', label: label };
  }
  return { found: false, path: null, label: label };
};

console.log('\nWith resolver finding page:');
console.log('Found:', MyMarked.parse('Hello [[ExistingPage]]'));
console.log('Found with label:', MyMarked.parse('Hello [[ExistingPage|Custom Label]]'));
console.log('Not found:', MyMarked.parse('Hello [[MissingPage]]'));