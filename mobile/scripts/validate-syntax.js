#!/usr/bin/env node
/**
 * Lightweight syntax validator for the mobile project.
 * Walks every .js/.jsx/.ts/.tsx file under app/ and src/ and parses it with @babel/parser.
 * Exits non-zero if any file fails to parse.
 */
const path = require("path");
const fs = require("fs");
const parser = require("@babel/parser");

const roots = ["app", "src"];
const exts = new Set([".js", ".jsx", ".ts", ".tsx"]);
const errors = [];
let total = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (exts.has(path.extname(entry.name))) {
      total++;
      try {
        const code = fs.readFileSync(p, "utf8");
        parser.parse(code, {
          sourceType: "module",
          allowImportExportEverywhere: true,
          plugins: ["jsx", "typescript", "classProperties", "objectRestSpread", "dynamicImport"],
        });
      } catch (e) {
        errors.push({ file: path.relative(process.cwd(), p), message: e.message });
      }
    }
  }
}

for (const r of roots) {
  const full = path.resolve(process.cwd(), r);
  if (fs.existsSync(full)) walk(full);
}

if (errors.length > 0) {
  console.error(`\n❌ ${errors.length} file(s) failed to parse (of ${total}):\n`);
  for (const e of errors) {
    console.error(`  • ${e.file}\n    ${e.message}\n`);
  }
  process.exit(1);
}
console.log(`✅ ${total} files parsed successfully`);
