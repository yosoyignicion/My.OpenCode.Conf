// SessionStore — CRUD over FS-persisted sessions. Single source of truth.
// Layout: STATE_DIR/sessions/<name>.meta.json + .pid + .sid + .exit + .ttl
//         STATE_DIR/logs/<name>.out + .err

import {
  readFileSync,
  writeFileSync,
  existsSync,
  unlinkSync,
  readdirSync,
  mkdirSync,
} from "node:fs";
import { join } from "node:path";
import { S, SESSIONS_DIR, INDEX_FILE } from "./paths.js";
import type { SessionMeta, SessionView, SessionStatus } from "./types.js";
import { pidExists } from "../utils/proc.js";
import { parseExitFromFile } from "../utils/exit-marker.js";
import { withLock, withLockSync } from "../utils/lock.js";

const meta = (name: string) => join(SESSIONS_DIR, `${name}${S.meta}`);
const pidFile = (name: string) => join(SESSIONS_DIR, `${name}${S.pid}`);
const sidFile = (name: string) => join(SESSIONS_DIR, `${name}${S.sid}`);
const exitFile = (name: string) => join(SESSIONS_DIR, `${name}${S.exit}`);
const ttlFile = (name: string) => join(SESSIONS_DIR, `${name}${S.ttl}`);

mkdirSync(SESSIONS_DIR, { recursive: true });

// ---- validation ----------------------------------------------------------

const VALID_NAME = /^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,63}$/;

export function isValidName(name: string): boolean {
  return VALID_NAME.test(name);
}

// ---- CRUD ----------------------------------------------------------------

export function exists(name: string): boolean {
  return existsSync(meta(name));
}

export function get(name: string): SessionMeta | null {
  const p = meta(name);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf-8")) as SessionMeta;
  } catch {
    return null;
  }
}

export function save(m: SessionMeta): void {
  writeFileSync(meta(m.name), JSON.stringify(m, null, 2), "utf-8");
}

export function patch(
  name: string,
  fields: Partial<SessionMeta>,
): SessionMeta | null {
  // patch is sync — retry briefly to acquire the lock
  const deadline = Date.now() + 200;
  while (Date.now() < deadline) {
    const r = withLockSync(`session:${name}`, () => {
      const cur = get(name);
      if (!cur) return null;
      const next: SessionMeta = { ...cur, ...fields };
      save(next);
      return next;
    });
    if (r !== null) return r;
  }
  // final attempt without lock — best-effort
  const cur = get(name);
  if (!cur) return null;
  const next: SessionMeta = { ...cur, ...fields };
  save(next);
  return next;
}

export function remove(name: string): void {
  for (const p of [
    meta(name),
    pidFile(name),
    sidFile(name),
    exitFile(name),
    ttlFile(name),
  ]) {
    try {
      unlinkSync(p);
    } catch {
      /* already gone */
    }
  }
}

export function list(): SessionMeta[] {
  const out: SessionMeta[] = [];
  for (const f of readdirSync(SESSIONS_DIR)) {
    if (!f.endsWith(S.meta)) continue;
    const name = f.slice(0, -S.meta.length);
    const m = get(name);
    if (m) out.push(m);
  }
  return out.sort((a, b) => (a.started_at < b.started_at ? 1 : -1));
}

// ---- derived state -------------------------------------------------------

/** Returns true if the session's PID is still alive. */
export function isRunning(name: string): boolean {
  const pf = pidFile(name);
  if (!existsSync(pf)) return false;
  try {
    const pid = parseInt(readFileSync(pf, "utf-8").trim(), 10);
    return pidExists(pid);
  } catch {
    return false;
  }
}

/** Update a session's status to a finished state if its PID died. */
export function pollExit(name: string): SessionMeta | null {
  return withLockSync(`session:${name}`, () => {
    const m = get(name);
    if (!m) return null;
    // Already terminal? nothing to do.
    if (m.status !== "running") return m;
    if (isRunning(name)) return m;
    // PID gone — mark finished.
    const exitCode = readExitCode(name);
    const finished_at = new Date().toISOString();
    const duration_ms = Date.parse(finished_at) - Date.parse(m.started_at);
    const next: SessionMeta = {
      ...m,
      status: exitCode === 0 ? "finished" : exitCode === null ? "failed" : "failed",
      exit_code: exitCode,
      finished_at,
      duration_ms,
    };
    save(next);
    cleanupPIDFiles(name);
    return next;
  });
}

export function readExitCode(name: string): number | null {
  const ef = exitFile(name);
  if (existsSync(ef)) {
    try {
      return parseInt(readFileSync(ef, "utf-8").trim(), 10);
    } catch {
      /* fall through */
    }
  }
  // Fallback: scan .out for the marker.
  const out = join(join(SESSIONS_DIR, "..", "logs"), `${name}${S.out}`);
  return parseExitFromFile(out);
}

function cleanupPIDFiles(name: string): void {
  for (const p of [pidFile(name), sidFile(name), ttlFile(name)]) {
    try {
      unlinkSync(p);
    } catch {
      /* gone */
    }
  }
}

// ---- view (DTO for MCP / TUI) -------------------------------------------

export function view(name: string): SessionView | null {
  const m = pollExit(name);
  if (!m) return null;
  return toView(m);
}

export function toView(m: SessionMeta): SessionView {
  // Re-poll if still claimed running to keep view fresh.
  const running = m.status === "running" && isRunning(m.name);
  const status: SessionStatus = running
    ? "running"
    : m.status === "running"
      ? "finished"
      : m.status;
  return {
    name: m.name,
    status,
    pid: m.pid,
    command: m.command,
    exit_code: m.exit_code,
    started_at: m.started_at,
    finished_at: m.finished_at,
    duration_ms: m.duration_ms,
    cwd: m.cwd,
    tags: m.tags ?? [],
    heal_attempts: m.heal_attempts ?? 0,
  };
}

export function viewAll(): SessionView[] {
  for (const m of list()) {
    // Each pollExit is individually locked; this is a best-effort sweep.
    if (m.status === "running") pollExit(m.name);
  }
  return list().map(toView);
}

// ---- index (lightweight, for fast enumeration) ---------------------------

export function rebuildIndex(): void {
  const rows = list().map(toView);
  writeFileSync(INDEX_FILE, JSON.stringify(rows, null, 2), "utf-8");
}
