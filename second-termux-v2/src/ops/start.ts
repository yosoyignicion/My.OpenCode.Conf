// bg_start — spawn detached via setsid, capture exit marker, persist meta.

import { spawn } from "node:child_process";
import { openSync, writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { hostname } from "node:os";
import { withLock } from "../utils/lock.js";
import { EXIT_MARKER, LOGS_DIR, SESSIONS_DIR } from "../state/paths.js";
import * as store from "../state/session.js";
import { predictRisk } from "../bridge/predictor.js";
import type { SessionMeta, StartResult, SpawnArgs } from "../state/types.js";

export async function start(args: SpawnArgs): Promise<StartResult> {
  if (!store.isValidName(args.name)) {
    throw new Error(
      `invalid session name '${args.name}' — use [a-zA-Z0-9_][a-zA-Z0-9_.-]{0,63}`,
    );
  }
  if (store.isRunning(args.name)) {
    throw new Error(`session '${args.name}' is already running`);
  }

  // Pre-flight: predict-failure check
  const risk = predictRisk(args.command);
  if (risk.status === "block") {
    throw new Error(`[PREDICT_FAILURE] blocked: ${risk.reason}${risk.fix ? ` — fix: ${risk.fix}` : ""}`);
  }

  return withLock(
    `session:${args.name}`,
    () => {
      const cwd = args.cwd ?? process.cwd();
      const outPath = join(LOGS_DIR, `${args.name}.out`);
      mkdirSync(dirname(outPath), { recursive: true });
      // Use 'wx' to create atomically if missing — no race vs concurrent start.
      try {
        writeFileSync(outPath, "", { flag: "wx" });
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      }

      const outFd = openSync(outPath, "a");
      // Wrap with exit marker — single line appended to stdout
      // stderr merged into stdout via shell redirect for chronological order
      const wrapped = `( ${args.command} 2>&1 ); echo ${EXIT_MARKER}=$?`;

      const proc = spawn(wrapped, {
        shell: "/bin/bash",
        cwd,
        detached: true,
        stdio: ["ignore", outFd, outFd],
        env: { ...process.env, SECOND_TERMUX_SESSION: args.name },
      });

      if (!proc.pid) {
        throw new Error(`failed to spawn: ${args.command}`);
      }

      // Persist pid
      writeFileSync(join(SESSIONS_DIR, `${args.name}.pid`), String(proc.pid));

      const meta: SessionMeta = {
        name: args.name,
        command: args.command,
        cwd,
        pid: proc.pid,
        sid: proc.pid, // detached session: PID == PGID under setsid via shell
        status: "running",
        started_at: new Date().toISOString(),
        finished_at: null,
        exit_code: null,
        ttl: args.ttl ?? null,
        tags: args.tags ?? [],
        parent: null,
        heal_attempts: 0,
        duration_ms: null,
        host: hostname(),
      };
      store.save(meta);

      // Detach
      proc.unref();

      const result: StartResult = {
        name: args.name,
        pid: proc.pid,
        status: "running",
        started_at: meta.started_at,
      };
      return result;
    },
    10000,
  );
}

/** Remove a session's pid file (called by stop/kill after process termination). */
export function cleanupPidFiles(name: string): void {
  for (const suf of [".pid", ".sid", ".ttl"]) {
    try {
      unlinkSync(join(SESSIONS_DIR, `${name}${suf}`));
    } catch {
      /* gone */
    }
  }
}
