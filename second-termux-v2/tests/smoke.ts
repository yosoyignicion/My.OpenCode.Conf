// End-to-end smoke: spawn a real shell command, wait for it, verify the premium line.

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = mkdtempSync(join(tmpdir(), "st-smoke-"));
process.env.SECOND_TERMUX_STATE_DIR = tmp;

const st = join(import.meta.dirname ?? ".", "..", "cli", "st.ts");

function run(args: string[]): { stdout: string; stderr: string; code: number } {
  const r = spawnSync("npx", ["tsx", st, ...args], { encoding: "utf-8" });
  return { stdout: r.stdout ?? "", stderr: r.stderr ?? "", code: r.status ?? 1 };
}

const name = "smoke_" + Math.random().toString(36).slice(2, 6);

const r1 = run(["start", name, "echo hello && exit 0"]);
if (r1.code !== 0) {
  console.error("start failed:", r1.stderr);
  process.exit(1);
}
console.log("✓ start");

const r2 = run(["wait", name, "--timeout", "10"]);
if (r2.code !== 0) {
  console.error("wait failed:", r2.stderr);
  process.exit(1);
}
if (!/✓ 0/.test(r2.stdout)) {
  console.error("premium line missing:", r2.stdout);
  process.exit(1);
}
console.log("✓ wait (premium line):", r2.stdout.trim());

const r3 = run(["logs", name, "--lines", "5"]);
if (!/hello/.test(r3.stdout)) {
  console.error("logs missing content:", r3.stdout);
  process.exit(1);
}
console.log("✓ logs");

const r4 = run(["list"]);
if (!new RegExp(name).test(r4.stdout)) {
  console.error("list missing session:", r4.stdout);
  process.exit(1);
}
console.log("✓ list");

const r5 = run(["cleanup"]);
console.log("✓ cleanup:", r5.stdout.trim());

rmSync(tmp, { recursive: true, force: true });
console.log("\nSMOKE PASSED");
