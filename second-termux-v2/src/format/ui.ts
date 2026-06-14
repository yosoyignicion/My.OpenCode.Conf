// UI table / notification formatters for bg_list, bg_status, and TUI sidebar.

import { sym } from "./symbols.js";
import type { SessionView, SessionStatus } from "../state/types.js";

const W = { name: 32, status: 12, pid: 8, ec: 6 };

function pad(s: string, w: number): string {
  // Always exactly w characters. If too long, truncate and append '…' (1 char).
  if (s.length > w) return s.slice(0, Math.max(0, w - 1)) + "…";
  return s.padEnd(w);
}

function fmtStarted(iso: string): string {
  if (!iso) return "—".padEnd(8);
  // "HH:MM:SS" = 8 chars
  return iso.slice(11, 19).padEnd(8);
}

function statusIcon(status: SessionStatus): string {
  switch (status) {
    case "running":
      return sym.spin;
    case "finished":
      return sym.ok;
    case "failed":
      return sym.err;
    case "timed_out":
      return sym.warn;
    case "healed":
      return sym.heal;
    case "killed":
    case "stopped":
      return sym.kill;
    default:
      return sym.info;
  }
}

export function empty(): string {
  return `${sym.info} no sessions`;
}

export function row(v: SessionView): string {
  const icon = statusIcon(v.status);
  return `${icon} ${pad(v.name, W.name)} ${pad(v.status, W.status)} ${pad(String(v.pid ?? "—"), W.pid)} ${pad(v.exit_code == null ? "—" : String(v.exit_code), W.ec)} ${fmtStarted(v.started_at)}`;
}

export function header(): string {
  return `  ${pad("NAME", W.name)} ${pad("STATUS", W.status)} ${pad("PID", W.pid)} ${pad("EXIT", W.ec)} STARTED`;
}

export function table(rows: SessionView[]): string {
  if (rows.length === 0) return empty();
  const running = rows.filter((r) => r.status === "running");
  const done = rows.filter((r) => r.status !== "running");
  const out: string[] = [];
  if (running.length) {
    out.push(`${sym.run} Running (${running.length})`);
    out.push(header());
    for (const r of running) out.push(row(r));
  }
  if (done.length) {
    if (running.length) out.push("");
    out.push(`${sym.ok} Finished (${done.length})`);
    out.push(header());
    for (const r of done) out.push(row(r));
  }
  return out.join("\n");
}

export function notification(v: SessionView): string {
  const icon = statusIcon(v.status);
  const label =
    v.status === "finished"
      ? "FINISHED"
      : v.status === "healed"
        ? "HEALED"
        : v.status === "timed_out"
          ? "TIMED_OUT"
          : v.status === "stopped"
            ? "STOPPED"
            : v.status === "killed"
              ? "KILLED"
              : "FAILED";
  const dur = ((v.duration_ms ?? 0) / 1000).toFixed(2);
  return `${icon} [${v.name}] ${label} (ec=${v.exit_code ?? "?"}, ${dur}s)`;
}
