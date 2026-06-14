// bg_cleanup — GC stale session files; --all also stops running.

import { rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { SESSIONS_DIR, LOGS_DIR } from "../state/paths.js";
import * as store from "../state/session.js";
import { killHard } from "./stop.js";

export interface CleanupResult {
  cleaned: string[];
  stopped: string[];
}

function rmByPrefix(dir: string, name: string): void {
  if (!existsSync(dir)) return;
  // Glob by name.* — Node has no glob, so we just attempt the known suffixes.
  // For a robust solution, we'd use fs.glob (Node 22+).
  const suffixes = [".meta.json", ".pid", ".sid", ".exit", ".ttl", ".out", ".err"];
  for (const suf of suffixes) {
    const p = join(dir, `${name}${suf}`);
    try { rmSync(p, { force: true }); } catch { /* */ }
  }
}

export async function cleanup(all = false): Promise<CleanupResult> {
  const cleaned: string[] = [];
  const stopped: string[] = [];

  for (const m of store.list()) {
    if (store.isRunning(m.name)) {
      if (all) {
        await killHard(m.name);
        stopped.push(m.name);
      }
      continue;
    }
    // Best-effort remove all known session files.
    rmByPrefix(SESSIONS_DIR, m.name);
    rmByPrefix(LOGS_DIR, m.name);
    cleaned.push(m.name);
  }
  return { cleaned, stopped };
}
