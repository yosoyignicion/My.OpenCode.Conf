#!/usr/bin/env node
// validate-jsonc.mjs — strict JSONC validation (preserves strings, strips comments).
// Usage: node scripts/validate-jsonc.mjs <path>
// Exit 0 if valid, 1 with diagnostic on stderr if not.

import { readFileSync } from "node:fs";

const path = process.argv[2];
if (!path) { console.error("usage: validate-jsonc.mjs <path>"); process.exit(2); }

let raw;
try { raw = readFileSync(path, "utf8"); }
catch (e) { console.error(`cannot read ${path}: ${e.message}`); process.exit(1); }

let out = "";
let i = 0, inStr = false, q = "";
while (i < raw.length) {
  const c = raw[i];
  const n = raw[i + 1];
  if (inStr) {
    out += c;
    if (c === "\\" && n !== undefined) { out += n; i += 2; continue; }
    if (c === q) inStr = false;
    i++;
    continue;
  }
  if (c === '"' || c === "'") { inStr = true; q = c; out += c; i++; continue; }
  if (c === "/" && n === "/") { while (i < raw.length && raw[i] !== "\n") i++; continue; }
  if (c === "/" && n === "*") {
    i += 2;
    while (i < raw.length && !(raw[i] === "*" && raw[i + 1] === "/")) i++;
    i += 2;
    continue;
  }
  out += c;
  i++;
}

try { JSON.parse(out); }
catch (e) { console.error(`JSON parse failed: ${e.message}`); process.exit(1); }
process.exit(0);
