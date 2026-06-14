// bg_stop / bg_kill — graceful SIGTERM→SIGKILL or hard SIGKILL.

import { unlinkSync } from "node:fs";
import { join } from "node:path";
import { SESSIONS_DIR } from "../state/paths.js";
import * as store from "../state/session.js";
import { withLock } from "../utils/lock.js";
import { killProcess, killProcessGroup } from "../utils/proc.js";
import { bridgeEngramOnFinish } from "../bridge/engram.js";
import type { StopResult, SessionStatus } from "../state/types.js";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function stopByName(
  name: string,
  opts: { force?: boolean; reason?: string } = {},
): Promise<StopResult> {
  return withLock(`session:${name}`, async () => {
    let m = store.get(name);
    if (!m) throw new Error(`session '${name}' not found`);
    store.pollExit(name);
    m = store.get(name);
    if (!m) throw new Error(`session '${name}' not found`);

    if (!store.isRunning(name)) {
      return {
        name,
        status: m.status,
        duration_ms: m.duration_ms ?? 0,
      };
    }
    if (!m.pid) throw new Error(`session '${name}' has no pid`);

    const sid = m.sid ?? m.pid;
    const force = opts.force ?? false;
    const reason: SessionStatus =
      opts.reason === "ttl_expired"
        ? "timed_out"
        : opts.reason === "user"
          ? "stopped"
          : "killed";

    if (force) {
      if (!killProcessGroup(sid, "SIGKILL")) killProcess(m.pid, "SIGKILL");
    } else {
      if (!killProcessGroup(sid, "SIGTERM")) killProcess(m.pid, "SIGTERM");
      await sleep(500);
      if (store.isRunning(name)) {
        if (!killProcessGroup(sid, "SIGKILL")) killProcess(m.pid, "SIGKILL");
      }
    }

    // Try to read the exit code from the marker written by the wrapper shell.
    const exitCode = store.readExitCode(name) ?? -1;
    const finished_at = new Date().toISOString();
    const duration_ms = Date.parse(finished_at) - Date.parse(m.started_at);
    const next = { ...m, status: reason, finished_at, duration_ms, exit_code: exitCode };
    store.save(next);

    // best-effort pid file cleanup
    for (const suf of [".pid", ".ttl"]) {
      try {
        unlinkSync(join(SESSIONS_DIR, `${name}${suf}`));
      } catch {
        /* */
      }
    }

    // Fire-and-forget engram bridge (off the hot path).
    bridgeEngramOnFinish({
      name,
      exit_code: exitCode,
      duration_ms,
      status: reason,
    }).catch(() => {
      /* best-effort */
    });

    return { name, status: reason, duration_ms };
  });
}

export const stop = (name: string) => stopByName(name, { reason: "user" });
export const killHard = (name: string) => stopByName(name, { reason: "killed", force: true });
