#!/usr/bin/env node
// patch-opencode-config.mjs
// Patches ~/.config/opencode/opencode.jsonc in a jsonc-friendly way:
//   - ensures "mcp.second-termux" is registered with the right server path
//   - ensures "skills.paths" includes the repo's opencode-integration folder
// Idempotent: re-running with no changes is a no-op.
//
// Usage:
//   node scripts/patch-opencode-config.mjs --config PATH --repo PATH [--dry-run]

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { argv, exit } from "node:process";

function parseArgs() {
  const args = { config: "", repo: "", dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--config") args.config = argv[++i];
    else if (a === "--repo") args.repo = argv[++i];
    else if (a === "--dry-run") args.dryRun = argv[++i] === "true";
  }
  if (!args.config || !args.repo) {
    console.error("usage: --config PATH --repo PATH [--dry-run true|false]");
    exit(1);
  }
  return args;
}

const { config, repo, dryRun } = parseArgs();
const serverJs = `${repo}/dist/src/server.js`;
const skillPath = `${repo}/opencode-integration`;

if (!existsSync(config)) { console.error(`not found: ${config}`); exit(1); }
if (!existsSync(serverJs)) { console.error(`not found: ${serverJs} (run npm run build first)`); exit(1); }

const raw = readFileSync(config, "utf8");

// --- 1. ensure skills.paths contains the v2 opencode-integration folder ---
let out = raw;
const skillPathRegex = new RegExp(
  `("path"\\s*:\\s*\\[)([^\\]]*?)(\\]\\s*,\\s*"instructions"|\\]\\s*,?\\s*\\n\\s*"compaction"|\\]\\s*,?\\s*\\n\\s*"mcp")`,
  "m"
);
const block = raw.match(skillPathRegex);
let needsSkill = true;
if (block) {
  if (block[2].includes(skillPath)) needsSkill = false;
}

if (needsSkill) {
  if (block) {
    // inject into existing array
    const inner = block[2].replace(/\s+$/, "");
    const injection = `${inner}\n      "${skillPath}"\n    `;
    out = out.replace(skillPathRegex, `$1${injection}$3`);
  } else {
    warn("couldn't find skills.paths block — leaving config as-is");
  }
}

// --- 2. ensure mcp.second-termux is registered ---
// We do this by string surgery because the file is jsonc. We anchor on the
// literal key and either replace an existing block or insert a new one.
const mcpMarker = '"mcp"';
const serverKey = '"second-termux"';

if (out.includes(`"second-termux":`)) {
  // Replace the existing block by matching the whole JSON object value.
  // The shape is consistent: it has keys "type","command","enabled","timeout".
  const re = new RegExp(
    `(\\n\\s*${serverKey}\\s*:\\s*\\{)[\\s\\S]*?(\\n\\s*\\})`,
    "m"
  );
  const replacement = `
    "second-termux": {
      "type": "local",
      "command": [
        "node",
        "${serverJs}"
      ],
      "enabled": true,
      "timeout": 30000
    }`;
  out = out.match(re) ? out.replace(re, replacement) : out;
} else {
  // Insert before the closing brace of "mcp": { ... }
  // The "mcp" object is the last sibling before "plugin" in the canonical config.
  const insertBefore = '"plugin"';
  if (out.includes(insertBefore)) {
    out = out.replace(
      insertBefore,
      `"second-termux": {
      "type": "local",
      "command": [
        "node",
        "${serverJs}"
      ],
      "enabled": true,
      "timeout": 30000
    },
    ${insertBefore}`
    );
  } else {
    // Fallback: insert before the final closing brace of the file.
    out = out.replace(/\n\}\s*$/, `,
    "second-termux": {
      "type": "local",
      "command": [
        "node",
        "${serverJs}"
      ],
      "enabled": true,
      "timeout": 30000
    }
  }
`);
  }
}

if (out === raw) {
  console.log("no changes needed");
  exit(0);
}

if (dryRun) {
  console.log("--- DRY RUN: would write ---");
  console.log(out);
} else {
  writeFileSync(config, out, "utf8");
  console.log(`patched: ${config}`);
}

function warn(msg) { console.warn(`! ${msg}`); }
