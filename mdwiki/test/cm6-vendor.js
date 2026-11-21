// Test: CM6 vendor files have no external references and cm-editor.js works in Node
import fs from "fs";
import path from "path";

const vendorDir = path.resolve("public/vendor/cm6");
const files = fs.readdirSync(vendorDir).filter((f) => f.endsWith(".js"));

let hasExternalRef = false;

for (const file of files) {
  const content = fs.readFileSync(path.join(vendorDir, file), "utf8");
  // Simple check: look for import ... from "./" pattern
  // Use a simpler regex to avoid backtracking issues
  const importMatches = content.matchAll(/import\s+[^;]+from\s+["'](\.\/[^"']+)["']/g);
  for (const match of importMatches) {
    const importPath = match[1];
    // Check for external CDN references in the import path
    if (/jsdelivr|cdn\.|unpkg|https?:\/\/|\/npm\//.test(importPath)) {
      console.error(`FAIL: ${file} contains external CDN reference in import: ${importPath}`);
      hasExternalRef = true;
    }
  }
  
  // Also check for any non-local imports (imports that don't start with ./)
  const nonLocalMatches = content.matchAll(/import\s+[^;]+from\s+["']((?!\.\/)[^"']+)["']/g);
  for (const match of nonLocalMatches) {
    const importPath = match[1];
    // Skip template literals
    if (importPath && importPath.startsWith("${")) continue;
    console.error(`FAIL: ${file} contains non-local import: ${importPath}`);
    hasExternalRef = true;
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
