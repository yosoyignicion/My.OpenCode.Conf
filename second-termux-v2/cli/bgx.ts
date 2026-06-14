#!/usr/bin/env node
// `bgx` — premium smart background executor.
// Wraps any command through `st` (second-termux CLI) so the v2 state layout
// is used (XDG: ~/.local/share/second-termux/).
// Output: single premium line `✨ <name> ✓ <ec> (N.NNs) @HH:MM:SS` on success,
// `🔥 <name> ✗ <ec> (N.NNs) @HH:MM:SS` on failure. Stdout is held back unless
// AUTO_TAIL>0 (success) or always on failure (truncated).
//
// Usage:
//   bgx [--auto-tail=N] [--compress] [--heal] <command...>
//   env: BGX_TTL=<seconds>          default 1800
//        BGX_AUTO_TAIL=<N>          default 0
//        BGX_COMPRESS=true|false    default false
//        BGX_AUTO_HEAL=true|false   default false

import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const TTL = Number(process.env.BGX_TTL ?? 1800);
const COMPRESS = process.env.BGX_COMPRESS === "true";
const AUTO_HEAL = process.env.BGX_AUTO_HEAL === "true";
const STATE_DIR = process.env.SECOND_TERMUX_STATE_DIR
  ?? join(process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share"), "second-termux");
const SESSIONS_DIR = join(STATE_DIR, "sessions");

function readExitCode(name: string): number {
  // Read directly from .meta.json (single source of truth, no race).
  const metaPath = join(SESSIONS_DIR, `${name}.meta.json`);
  if (!existsSync(metaPath)) return 1;
  try {
    const data = JSON.parse(readFileSync(metaPath, "utf8"));
    return typeof data.exit_code === "number" ? data.exit_code : 1;
  } catch {
    return 1;
  }
}

const args = process.argv.slice(2);
let autoTail = Number(process.env.BGX_AUTO_TAIL ?? 0);
const rest: string[] = [];
for (const a of args) {
  if (a.startsWith("--auto-tail=")) {
    const parts = a.split("=");
    autoTail = Number(parts[1] ?? 0);
  } else if (a === "--compress") {} // handled via env; flag kept for compat
  else if (a === "--heal") {}      // handled via env; flag kept for compat
  else rest.push(a);
}

if (rest.length === 0) {
  console.error("usage: bgx [--auto-tail=N] [--compress] [--heal] <command...>");
  process.exit(2);
}

const firstToken = rest[0] ?? "";
const BASE = firstToken.replace(/^.*\//, "");
const SUFFIX = Math.floor(Math.random() * 4096).toString(16).padStart(3, "0");
const NAME = `bgx_${BASE}_${SUFFIX}`;
const START = Date.now() / 1000;

// Re-quote args for the single-string `command` slot in `st start`.
// bash-style quoting: single-quote wrap if needed; preserve double-quotes inside.
function shq(s: string): string {
  if (/^[A-Za-z0-9_\-\.\/=:@%+,]+$/.test(s)) return s;
  return `'${s.replace(/'/g, `'\\''`)}'`;
}
const CMD = rest.map(shq).join(" ");

function st(sub: string, ...a: string[]) {
  return spawnSync("st", [sub, ...a], { encoding: "utf8" });
}

const startR = st("start", NAME, CMD, "--ttl", String(TTL));
if (startR.status !== 0) {
  console.error(`bgx: st start failed: ${startR.stderr ?? ""}`);
  process.exit(1);
}

if (process.stdout.isTTY) process.stderr.write(`\r🔧 ${NAME} ⏳`);
st("wait", NAME, "--timeout", String(TTL));

let ec: number = readExitCode(NAME);

// --- auto-heal loop (max 2 attempts) ---
let heals = 0;
while (ec !== 0 && AUTO_HEAL && heals < 2) {
  const h = st("heal", NAME);
  const applied = /applied/.test(h.stdout ?? "");
  if (!applied) break;
  heals++;
  st("start", NAME, CMD, "--ttl", String(TTL));
  st("wait", NAME, "--timeout", String(TTL));
  ec = readExitCode(NAME);
}

// collect logs (skip exit-marker line)
let logs = "";
if (ec === 0 && autoTail > 0) {
  const r = st("logs", NAME, "--lines", String(autoTail));
  logs = (r.stdout ?? "").split("\n").filter(l => !l.includes("__SECOND_TERMUX_EXIT__")).join("\n");
} else if (ec !== 0) {
  const r = st("logs", NAME, "--compress", "--lines", "15");
  logs = (r.stdout ?? "").split("\n").filter(l => l && !l.includes("__SECOND_TERMUX_EXIT__")).join("\n");
}

st("cleanup");

const dur = (Date.now() / 1000 - START).toFixed(2);
const ts = new Date().toTimeString().slice(0, 8);

if (ec === 0) {
  const head = heals > 0
    ? `✨ ${NAME} ✓ ${ec} (Auto-Sanado en ${dur}s, ${heals} fix) @${ts}`
    : `✨ ${NAME} ✓ ${ec} (${dur}s) @${ts}`;
  console.log(head);
  if (logs) {
    if (COMPRESS) {
      const lines = logs.split("\n");
      if (lines.length > 5) {
        console.log([...lines.slice(0, 3), `... (${lines.length - 6} lines hidden) ...`, ...lines.slice(-3)].join("\n"));
      } else {
        console.log(logs);
      }
    } else {
      console.log(logs);
    }
  }
} else {
  const head = heals > 0
    ? `🔥 ${NAME} ✗ ${ec} (${dur}s, ${heals} heal attempt(s) failed) @${ts}`
    : `🔥 ${NAME} ✗ ${ec} (${dur}s) @${ts}`;
  console.log(head);
  if (logs) console.log(logs);
}
process.exit(ec);
