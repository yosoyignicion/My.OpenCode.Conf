// XDG-compliant state directory for second-termux v2.
// Resolves ~/.local/share/second-termux by default, overridable via env.
// This is the SINGLE source of truth for all session persistence.

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const ENV = process.env.SECOND_TERMUX_STATE_DIR;

export const STATE_DIR = ENV
  ? ENV
  : join(process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share"), "second-termux");

// Subdirs
export const SESSIONS_DIR = join(STATE_DIR, "sessions");
export const LOGS_DIR = join(STATE_DIR, "logs");
export const LOCKS_DIR = join(STATE_DIR, "locks");
export const INDEX_FILE = join(STATE_DIR, "index.json");
export const ENGRAM_TELEMETRY = join(STATE_DIR, "engram-telemetry.log");
export const HEAL_AUDIT = join(STATE_DIR, "heal-audit.log");

mkdirSync(SESSIONS_DIR, { recursive: true });
mkdirSync(LOGS_DIR, { recursive: true });
mkdirSync(LOCKS_DIR, { recursive: true });

// File suffixes — single contract
export const S = {
  meta: ".meta.json",
  out: ".out",
  err: ".err",
  pid: ".pid",
  sid: ".sid",
  exit: ".exit",
  ttl: ".ttl",
  lock: ".lock",
} as const;

// Compose absolute paths for a given session name.
export const paths = (name: string) => ({
  meta: join(SESSIONS_DIR, `${name}${S.meta}`),
  out: join(LOGS_DIR, `${name}${S.out}`),
  err: join(LOGS_DIR, `${name}${S.err}`),
  pid: join(SESSIONS_DIR, `${name}${S.pid}`),
  sid: join(SESSIONS_DIR, `${name}${S.sid}`),
  exit: join(SESSIONS_DIR, `${name}${S.exit}`),
  ttl: join(SESSIONS_DIR, `${name}${S.ttl}`),
  lock: join(LOCKS_DIR, `${name}${S.lock}`),
});

// Exit marker protocol — single line appended to stdout, used to extract exit code reliably.
export const EXIT_MARKER = "__SECOND_TERMUX_EXIT__";
