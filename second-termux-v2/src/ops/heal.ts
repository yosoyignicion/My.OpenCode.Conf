// bg_heal — intelligent auto-healing of failed sessions.
// Heuristic: scan stderr for known signatures, pick a fix skill, optionally restart.

import { existsSync, readFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { LOGS_DIR, HEAL_AUDIT } from "../state/paths.js";
import * as store from "../state/session.js";
import { start } from "./start.js";
import { logs as logsOp } from "./logs.js";
import type { HealResult, SessionMeta } from "../state/types.js";

interface FixRule {
  rx: RegExp;
  label: string;
  fix_skill: string; // skill-matrix id
  fix_pattern: string; // human description
  apply?: (m: SessionMeta) => Promise<{ command: string; cwd?: string } | null>;
}

const RULES: FixRule[] = [
  {
    rx: /ECONNREFUSED|getaddrinfo ENOTFOUND|ETIMEDOUT/,
    label: "network",
    fix_skill: "http-client-patterns",
    fix_pattern: "retry with backoff (3 attempts, jittered)",
  },
  {
    rx: /Module not found|Cannot find module|ENOENT.*package\.json/,
    label: "missing-dep",
    fix_skill: "pnpm-orm-database",
    fix_pattern: "run install (npm ci / pnpm i --frozen-lockfile)",
    apply: async (m) => {
      if (!m) return null;
      const pkg = ["pnpm-lock.yaml", "package-lock.json", "yarn.lock"].find((f) =>
        existsSync(join(m.cwd, f)),
      );
      const cmd = pkg?.startsWith("pnpm") ? "pnpm i --frozen-lockfile" :
                  pkg?.startsWith("yarn") ? "yarn install --frozen-lockfile" :
                  "npm ci";
      return { command: cmd, cwd: m.cwd };
    },
  },
  {
    rx: /port already in use|EADDRINUSE/,
    label: "port-conflict",
    fix_skill: "load-balancing-algorithms-l4-l7",
    fix_pattern: "kill stale holder, re-spawn",
    apply: async (m) => {
      if (!m) return null;
      const portMatch = (logsOp(m.name, { tail: 50 }) + " " + m.command).match(/(?:port|:)(\d{2,5})/);
      const port = portMatch?.[1];
      if (!port) return null;
      return {
        command: `fuser -k ${port}/tcp 2>/dev/null; sleep 1; ${m.command}`,
        cwd: m.cwd,
      };
    },
  },
  {
    rx: /permission denied|EACCES/,
    label: "permission",
    fix_skill: "defensive-security-hardening",
    fix_pattern: "chmod +x on the offending path; rerun",
  },
  {
    rx: /out of memory|OOMKilled|Cannot allocate memory/,
    label: "oom",
    fix_skill: "performance-profiling-optimization",
    fix_pattern: "split into smaller batches; raise --max-old-space-size",
  },
  {
    rx: /timeout exceeded|ETIMEDOUT/,
    label: "timeout",
    fix_skill: "fault-injection-chaos-engineering",
    fix_pattern: "raise --ttl; check upstream latency",
  },
  {
    rx: /segfault|SIGSEGV|core dumped/,
    label: "segfault",
    fix_skill: "cpp-memory-safety",
    fix_pattern: "do not retry — collect core dump, bisect native dep",
  },
];

export async function heal(name: string): Promise<HealResult> {
  const m = store.get(name);
  if (!m) return { applied: false, detail: `session '${name}' not found` };
  if (m.status === "running") return { applied: false, detail: "session still running — nothing to heal" };

  // Build corpus from logs
  const outPath = join(LOGS_DIR, `${m.name}.out`);
  const errPath = join(LOGS_DIR, `${m.name}.err`);
  const corpus = [
    existsSync(errPath) ? readFileSync(errPath, "utf-8") : "",
    existsSync(outPath) ? readFileSync(outPath, "utf-8") : "",
    m.command,
  ].join("\n");

  // Find matching rule
  const rule = RULES.find((r) => r.rx.test(corpus));
  if (!rule) {
    audit(name, "no-rule", "no signature matched");
    return { applied: false, detail: "no signature matched — manual inspection required" };
  }

  audit(name, rule.label, rule.fix_pattern);

  // Apply if rule has an action
  if (rule.apply) {
    const next = await rule.apply(m);
    if (next) {
      const newName = `${name}_heal_${Date.now().toString(36).slice(-4)}`;
      const r = await start({
        name: newName,
        command: next.command,
        cwd: next.cwd,
        ttl: (m.ttl ?? 1800) + 600,
        tags: [...(m.tags ?? []), "heal", rule.label],
      });
      // mark original as healed
      store.patch(name, { status: "healed", heal_attempts: (m.heal_attempts ?? 0) + 1 });
      return {
        applied: true,
        detail: `started ${newName} with fix: ${rule.fix_pattern}`,
        fix_skill: rule.fix_skill,
        fix_pattern: rule.fix_pattern,
        risk_score: 0.2,
      };
    }
  }

  // No automatic action — just record the diagnosis
  return {
    applied: false,
    detail: `signature '${rule.label}' detected; no automatic action — ${rule.fix_pattern}`,
    fix_skill: rule.fix_skill,
    fix_pattern: rule.fix_pattern,
    risk_score: 0.5,
  };
}

function audit(name: string, label: string, detail: string): void {
  const line = `${new Date().toISOString()} ${name} ${label} ${detail}\n`;
  try {
    appendFileSync(HEAL_AUDIT, line, "utf-8");
  } catch {
    /* best-effort */
  }
}
