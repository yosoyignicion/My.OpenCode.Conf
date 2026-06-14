// Premium line formatter — the single line that replaces ALL bash output in the TUI.
// Contract:  <icon> <name> <ec-icon> <ec> (<duration>s) [@HH:MM:SS]
// Example:   ✨ bgx_npm_X7k ✓ 0 (2.35s) @14:30:01
//            🔥 bgx_pytest_aB2 ✗ 1 (0.50s) @14:31:12

import { sym } from "./symbols.js";
import type { JobResult, SessionView } from "../state/types.js";

function fmtDuration(ms: number | null): string {
  if (ms == null) return "?";
  return (ms / 1000).toFixed(2);
}

function nowHMS(): string {
  return new Date().toTimeString().slice(0, 8);
}

export function line(result: JobResult): string {
  const ec = result.exit_code;
  const ok = ec === 0;
  const icon = ok ? sym.ok : sym.err;
  const ecMark = ok ? "✓" : "✗";
  return `${icon} ${result.name} ${ecMark} ${ec} (${fmtDuration(result.duration_ms)}s) @${nowHMS()}`;
}

export function lineFromView(v: SessionView): string {
  if (v.status === "running") {
    return `${sym.spin} ${v.name} … running (pid ${v.pid ?? "?"}) @${nowHMS()}`;
  }
  return line({
    name: v.name,
    exit_code: v.exit_code ?? -1,
    duration_ms: v.duration_ms ?? 0,
    status: v.status,
  });
}

// Healed line:  ✦ bgx_X ✓ 0 (auto-sanado en 2.1s, 1 fix) @HH:MM:SS
export function lineHealed(name: string, attempts: number, duration_ms: number | null = null): string {
  return `${sym.heal} ${name} ✓ 0 (auto-sanado en ${fmtDuration(duration_ms)}s, ${attempts} fix) @${nowHMS()}`;
}

// Top-level summary for multi-job views
export function summary(count: number, running: number, failed: number): string {
  return `${sym.info} ${count} sessions · ${sym.spin} ${running} running · ${failed > 0 ? sym.err : sym.ok} ${failed} failed`;
}
