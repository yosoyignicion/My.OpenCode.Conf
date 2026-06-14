// Exit marker protocol — parse __SECOND_TERMUX_EXIT__=N from stdout tail.

import { readFileSync, existsSync } from "node:fs";
import { EXIT_MARKER } from "../state/paths.js";

const EXIT_RE = new RegExp(`^${EXIT_MARKER}=(-?\\d+)\\s*$`);

/** Parse exit code from the last line matching EXIT_MARKER pattern. */
export function parseExitFromFile(path: string): number | null {
  if (!existsSync(path)) return null;
  try {
    const text = readFileSync(path, "utf-8");
    const lines = text.split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const m = EXIT_RE.exec(lines[i]?.trim() ?? "");
      if (m && m[1]) return parseInt(m[1], 10);
    }
  } catch {
    /* unreadable */
  }
  return null;
}
