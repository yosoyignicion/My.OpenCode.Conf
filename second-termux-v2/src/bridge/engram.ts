// Engram bridge — emits a low-importance "command" memory for every finished job.
// Idempotent, fire-and-forget, non-blocking. NEVER throws.
//
// Output format: JSONL written to STATE_DIR/engram-telemetry.log.
// The plugin engram+zerotoken auto-indexes this file via FTS5.

import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { ENGRAM_TELEMETRY } from "../state/paths.js";
import type { JobResult } from "../state/types.js";

interface EngramEntry {
  type: "command";
  title: string;
  content: string;
  importance: number;
  scope: "project";
  tags: string[];
}

/**
 * Persist a memory entry for the finished job. The plugin engram+zerotoken
 * auto-indexes the file we write here. We avoid a direct DB write to keep
 * the bridge stateless and crash-safe.
 */
export async function bridgeEngramOnFinish(result: JobResult): Promise<void> {
  try {
    if (!existsSync(dirname(ENGRAM_TELEMETRY))) {
      mkdirSync(dirname(ENGRAM_TELEMETRY), { recursive: true });
    }
    const title = `cmd:${result.name}:ec${result.exit_code}`;
    const content = [
      `name: ${result.name}`,
      `ec: ${result.exit_code}`,
      `duration_ms: ${result.duration_ms}`,
      `status: ${result.status}`,
      `finished_at: ${new Date().toISOString()}`,
    ].join(" | ");

    const entry: EngramEntry = {
      type: "command",
      title,
      content,
      importance: result.exit_code === 0 ? 0.5 : 0.7,
      scope: "project",
      tags: ["second-termux", result.status],
    };

    appendFileSync(ENGRAM_TELEMETRY, JSON.stringify(entry) + "\n", "utf-8");
  } catch {
    /* never throw — this is best-effort telemetry */
  }
}
