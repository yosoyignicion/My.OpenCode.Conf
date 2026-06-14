// Tiny test runner — no external deps, runs all tests/*.test.ts + mcp-e2e + smoke.
// Usage: tsx tests/run.ts

import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const TESTS_DIR = join(import.meta.dirname ?? ".", ".");
let pass = 0;
let fail = 0;
const failures: string[] = [];
let totalChecks = 0;

const files = readdirSync(TESTS_DIR)
  .filter((f) => f.endsWith(".test.ts") || f === "mcp-e2e.ts" || f === "smoke.ts")
  .filter((f) => f !== "run.ts")
  .sort();

for (const f of files) {
  const path = join(TESTS_DIR, f);
  process.stderr.write(`▶ ${f}\n`);
  const res = spawnSync("npx", ["tsx", path], { encoding: "utf-8" });
  process.stderr.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  if (res.status === 0) {
    pass++;
    totalChecks += (res.stdout.match(/✓/g) ?? []).length;
  } else {
    failures.push(f);
    fail++;
  }
}

console.log(`\n${pass} passed · ${fail} failed · ${totalChecks} checks`);
if (fail > 0) {
  console.log("Failures:");
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
