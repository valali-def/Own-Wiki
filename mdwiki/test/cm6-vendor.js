// Test: CM6 vendor files have no external references and cm-editor.js works in Node
import fs from "fs";
import path from "path";

const vendorDir = path.resolve("public/vendor/cm6");
const files = fs.readdirSync(vendorDir).filter((f) => f.endsWith(".js"));

let hasExternalRef = false;

for (const file of files) {
  const content = fs.readFileSync(path.join(vendorDir, file), "utf8");
  // Check all import specifiers in ES module import statements at statement boundaries.
  // Match import/export at start of file or after ; { } newline
  // Patterns:
  //   import ... from "..." (with optional whitespace, minified: no space)
  //   import "..." (bare import)
  //   export ... from "..." (re-export)
  // Skip template literals (contain ${)
  // Use a regex that matches at statement boundaries
  const importRegex = /(?:^|[;{}])(?:\s*(?:import|export)\s+(?:[^;]*?\s+from\s*|)["']([^"']+)["'])/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    // Skip template literals
    if (importPath.includes("${")) continue;
    // Every specifier must start with "./" and must not contain "://", "jsdelivr" or "/npm/"
    if (!importPath.startsWith("./")) {
      console.error(`FAIL: ${file} contains non-local import: ${importPath}`);
      hasExternalRef = true;
    }
    if (/:\/\//.test(importPath) || /jsdelivr/i.test(importPath) || /\/npm\//.test(importPath)) {
      console.error(`FAIL: ${file} contains external CDN reference in import: ${importPath}`);
      hasExternalRef = true;
    }
  }
}

if (hasExternalRef) {
  process.exit(1);
}

console.log("OK: No external CDN references in vendor import statements");

// Test that cm-editor.js exports createEditor function
import { createEditor } from "../public/cm-editor.js";
if (typeof createEditor !== "function") {
  console.error("FAIL: cm-editor.js does not export createEditor function");
  process.exit(1);
}

console.log("OK: cm-editor.js exports createEditor function");
console.log("All tests passed!");
