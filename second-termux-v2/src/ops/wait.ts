// bg_wait — block (poll) until session finishes or timeout.

import * as store from "../state/session.js";
import type { JobResult } from "../state/types.js";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Wait for a session to finish. Returns the JobResult on natural completion.
 * Throws on timeout (we do NOT synthesize exit_code: -1, which would mask
 * real failures).
 */
export async function wait(name: string, timeout_s = 0): Promise<JobResult> {
  const m = store.get(name);
  if (!m) throw new Error(`session '${name}' not found`);

  const start = Date.now();
  const deadline = timeout_s > 0 ? start + timeout_s * 1000 : Number.POSITIVE_INFINITY;

  while (Date.now() < deadline) {
    const cur = store.pollExit(name);
    if (!cur) throw new Error(`session '${name}' vanished`);
    if (cur.status !== "running") {
      return {
        name,
        exit_code: cur.exit_code ?? -1,
        duration_ms: cur.duration_ms ?? Date.now() - Date.parse(cur.started_at),
        status: cur.status,
      };
    }
    await sleep(200);
  }
  throw new Error(`timeout: session '${name}' still running after ${timeout_s}s`);
}
