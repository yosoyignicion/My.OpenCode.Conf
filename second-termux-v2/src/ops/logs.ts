// bg_logs — non-blocking tail, compression, diagnosis.

import { readFileSync, existsSync, statSync, openSync, readSync, closeSync } from "node:fs";
import { join } from "node:path";
import { EXIT_MARKER, LOGS_DIR } from "../state/paths.js";
import * as store from "../state/session.js";

export interface LogsOptions {
  tail?: number; // last N lines
  compress?: boolean; // smart-compress (head 3 + ... + tail 3)
  diagnose?: boolean; // extract error signature
}

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB hard cap per read

export function logs(name: string, opts: LogsOptions = {}): string {
  const m = store.get(name);
  if (!m) throw new Error(`session '${name}' not found`);

  const outPath = join(LOGS_DIR, `${name}.out`);
  const errPath = join(LOGS_DIR, `${name}.err`);

  if (opts.diagnose) return diagnose(outPath, errPath);
  if (opts.tail !== undefined) return tailMerged(outPath, errPath, opts.tail, opts.compress ?? false);
  if (opts.compress) return compress(readAll(outPath, errPath));
  return readAll(outPath, errPath);
}

function tailMerged(out: string, err: string, n: number, compressOpt: boolean): string {
  // We merge OUT and ERR files (which are already in chronological order
  // because the shell wrapper does `2>&1`) and take the last N lines.
  // Then we re-label the EXIT_MARKER lines (which are stderr-merged-into-stdout
  // artifact) and keep [ERR] prefix for lines that originally went to stderr.
  // We do NOT keep the EXIT_MARKER in user-facing tail — strip it.
  const outText = existsSync(out) ? readFileSync(out, "utf-8") : "";
  const errText = existsSync(err) ? readFileSync(err, "utf-8") : "";
  const combined = outText; // 2>&1 means out already has stderr merged in
  const errOnly = errText;
  // Build a chronological merge of (out-merged-with-stderr) and (err if any separate)
  // For our setup, stderr is merged into out, so err file is empty. We honor
  // any err content if present.
  const outLines = combined.split("\n").filter((l) => l.length > 0 && !l.startsWith(EXIT_MARKER));
  const errLines = errOnly.split("\n").filter((l) => l.length > 0).map((l) => `[ERR] ${l}`);
  const merged = [...outLines, ...errLines];
  const tailed = merged.slice(-n);
  if (compressOpt) return compress(tailed.join("\n"));
  return tailed.join("\n");
}

function compress(input: string): string {
  const lines = input.split("\n").filter(Boolean);
  if (lines.length <= 8) return lines.join("\n");
  const head = lines.slice(0, 3);
  const tail = lines.slice(-3);
  return [...head, `... (${lines.length - 6} lines hidden) ...`, ...tail].join("\n");
}

function readAll(out: string, err: string): string {
  let outText = "";
  let errText = "";
  if (existsSync(out)) {
    const stat = statSync(out);
    if (stat.size > MAX_BYTES) {
      const fd = openSync(out, "r");
      const buf = Buffer.alloc(MAX_BYTES);
      const pos = stat.size - MAX_BYTES;
      readSync(fd, buf, 0, MAX_BYTES, pos);
      outText = `[truncated ${MAX_BYTES}B of ${stat.size}B]\n` + buf.toString("utf-8");
      closeSync(fd);
    } else {
      outText = readFileSync(out, "utf-8");
    }
  }
  if (existsSync(err)) errText = readFileSync(err, "utf-8");
  return outText + (errText ? `\n--- stderr ---\n${errText}` : "");
}

function diagnose(out: string, err: string): string {
  const corpus = [existsSync(err) ? readFileSync(err, "utf-8") : "", existsSync(out) ? readFileSync(out, "utf-8") : ""].join("\n");
  const lines = corpus.split("\n").filter(Boolean);

  const signatures: { rx: RegExp; label: string; fix?: string }[] = [
    { rx: /Module not found|Cannot find module|ENOENT.*package\.json/, label: "missing-dependency", fix: "run install (pnpm i / npm i / pip install -r requirements.txt)" },
    { rx: /EACCES|permission denied/i, label: "permission-denied", fix: "chmod +x or check file ownership" },
    { rx: /ECONNREFUSED|getaddrinfo ENOTFOUND/, label: "network-unreachable", fix: "verify host/port, check firewall" },
    { rx: /SyntaxError|Unexpected token/, label: "syntax-error", fix: "lint with tsc/eslint before run" },
    { rx: /OOMKilled|Cannot allocate memory|out of memory/i, label: "oom", fix: "increase heap / reduce batch size" },
    { rx: /TypeError.*undefined|null/, label: "null-ref", fix: "guard with optional chaining or null-check" },
    { rx: /segfault|SIGSEGV|core dumped/i, label: "segfault", fix: "collect core dump, bisect native dep" },
    { rx: /ETIMEDOUT|timeout exceeded/i, label: "timeout", fix: "raise --ttl or split work" },
    { rx: /port already in use|EADDRINUSE/, label: "port-conflict", fix: "kill the holder: lsof -i :PORT" },
  ];

  const hits: { line: string; label: string; fix?: string }[] = [];
  for (const sig of signatures) {
    for (const line of lines) {
      if (sig.rx.test(line)) {
        hits.push({ line: line.slice(0, 240), label: sig.label, fix: sig.fix });
        if (hits.length >= 5) break;
      }
    }
    if (hits.length >= 5) break;
  }

  if (hits.length === 0) {
    const lastErr = lines.filter((l) => /error|ERROR|Error/.test(l)).slice(-3);
    return lastErr.length
      ? `no signature matched; recent error lines:\n${lastErr.join("\n")}`
      : "no error signature detected";
  }

  return hits.map((h) => `[${h.label}] ${h.line}${h.fix ? `\n   fix: ${h.fix}` : ""}`).join("\n");
}
