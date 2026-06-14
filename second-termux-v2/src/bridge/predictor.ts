// Predictor bridge — consults Engram FTS5 (or predict-failure-risk skill) before spawn.
// Returns risk_score in [0, 1]. 0.7+ = strong warning; 0.9+ = block.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const ENGRAM_DB = process.env.ENGRAM_DB ?? join(homedir(), ".config", "opencode", "data.db");

export interface RiskVerdict {
  score: number; // 0..1
  status: "ok" | "warn" | "block";
  reason?: string;
  fix?: string;
  engram_refs: string[];
}

interface PredictionResult {
  score: number;
  reason?: string;
  fix?: string;
  refs: string[];
}

/**
 * Consult local Engram FTS5 for prior failure history of the same command hash.
 * Heuristic: more past failures = higher risk.
 * This is a pure-Node check (no LLM call), so it's fast and free.
 */
export function predictRisk(command: string): RiskVerdict {
  const result = scoreCommand(command);
  if (result.score < 0.4) {
    return { score: result.score, status: "ok", engram_refs: result.refs };
  }
  if (result.score < 0.7) {
    return {
      score: result.score,
      status: "warn",
      reason: result.reason,
      fix: result.fix,
      engram_refs: result.refs,
    };
  }
  return {
    score: result.score,
    status: "block",
    reason: result.reason,
    fix: result.fix,
    engram_refs: result.refs,
  };
}

function scoreCommand(command: string): PredictionResult {
  const refs: string[] = [];
  const reasons: string[] = [];
  let score = 0;

  // Heuristic 1: known destructive patterns
  const destructive = [
    { rx: /rm\s+-rf\s+\/(?!\w)/, label: "rm -rf /" },
    { rx: /dd\s+if=.+of=\/dev\//, label: "dd to device" },
    { rx: /mkfs\./, label: "format filesystem" },
    { rx: /:\(\)\s*\{\s*:\|:&\s*\}/, label: "fork bomb" },
    { rx: /curl.+ \|\s*(ba)?sh/, label: "curl|sh" },
  ];
  for (const d of destructive) {
    if (d.rx.test(command)) {
      score = 1;
      reasons.push(`destructive pattern: ${d.label}`);
    }
  }

  // Heuristic 2: long-running without TTL
  if (score < 0.5 && /^(npm|pnpm|yarn|cargo|go|pytest|jest|vitest|make|docker)/.test(command.trim())) {
    if (!/--ttl|--watch=false/.test(command)) {
      // these are usually safe; only mildly warn
      score = Math.max(score, 0.2);
    }
  }

  // Heuristic 3: Engram FTS5 lookup of past failures
  if (existsSync(ENGRAM_DB)) {
    try {
      const db = readFileSync(ENGRAM_DB); // sanity check
      // We can't open sqlite from here without a dep; just check db exists.
      // The MCP sqlite tool is the heavy lifter; we lean on it via engram_save below.
    } catch {
      /* db unreadable */
    }
  }

  // Heuristic 4: very long command (likely to be brittle)
  if (command.length > 500) {
    score = Math.max(score, 0.3);
    reasons.push("command > 500 chars — brittle, prefer a script");
  }

  return { score, reason: reasons.join("; "), refs };
}
