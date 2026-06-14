// Tests for start / stop / kill / wait ops. Real process spawn (no mocks).

import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = mkdtempSync(join(tmpdir(), "st-ops-"));
process.env.SECOND_TERMUX_STATE_DIR = tmp;

const start = (await import("../src/ops/start.js")).start;
const stop = (await import("../src/ops/stop.js")).stop;
const killHard = (await import("../src/ops/stop.js")).killHard;
const wait = (await import("../src/ops/wait.js")).wait;
const status = (await import("../src/ops/status.js")).status;
const restart = (await import("../src/ops/restart.js")).restart;
const store = await import("../src/state/session.js");

const nameOf = (p: string) => "t_" + p + "_" + Math.random().toString(36).slice(2, 6);

// 1. start() rejects invalid name
{
  let threw = false;
  try { await start({ name: "with space", command: "true" }); }
  catch (e) { threw = (e as Error).message.includes("invalid session name"); }
  assert.ok(threw, "start() must reject invalid names");
  console.log("✓ start rejects invalid name");
}

// 2. start() rejects destructive commands
{
  let threw = false;
  try { await start({ name: nameOf("rm"), command: "rm -rf /" }); }
  catch (e) { threw = (e as Error).message.includes("[PREDICT_FAILURE]"); }
  assert.ok(threw, "start() must block destructive commands");
  console.log("✓ start blocks destructive commands");
}

// 3. start() succeeds for benign command
{
  const n = nameOf("hi");
  const r = await start({ name: n, command: "echo hi && exit 0" });
  assert.equal(r.name, n);
  assert.ok(r.pid > 0);
  assert.equal(r.status, "running");
  // wait completes with exit 0
  const w = await wait(n, 5);
  assert.equal(w.exit_code, 0);
  assert.equal(w.status, "finished");
  console.log("✓ start/wait success path");
}

// 4. start() captures non-zero exit code
{
  const n = nameOf("err");
  await start({ name: n, command: "exit 42" });
  const w = await wait(n, 5);
  assert.equal(w.exit_code, 42);
  assert.equal(w.status, "failed");
  console.log("✓ start captures non-zero exit code");
}

// 5. start() rejects duplicate
{
  const n = nameOf("dup");
  await start({ name: n, command: "sleep 0.5" });
  await new Promise((r) => setTimeout(r, 100));
  let threw = false;
  try { await start({ name: n, command: "echo x" }); }
  catch (e) { threw = (e as Error).message.includes("already running"); }
  assert.ok(threw, "duplicate start must throw");
  await wait(n, 5);
  console.log("✓ start rejects duplicate");
}

// 6. stop() on a long-running process
{
  const n = nameOf("stop");
  await start({ name: n, command: "sleep 30" });
  await new Promise((r) => setTimeout(r, 200));
  const r = await stop(n);
  assert.ok(["stopped", "killed"].includes(r.status), `stop status was ${r.status}`);
  // subsequent wait should reflect non-zero (interrupted)
  const w = await wait(n, 5);
  assert.notEqual(w.exit_code, 0, "stopped process should have non-zero exit");
  console.log("✓ stop interrupts running process");
}

// 7. kill() is hard
{
  const n = nameOf("kill");
  await start({ name: n, command: "sleep 30" });
  await new Promise((r) => setTimeout(r, 200));
  const r = await killHard(n);
  assert.equal(r.status, "killed");
  console.log("✓ kill hard works");
}

// 8. status() returns view
{
  const n = nameOf("stat");
  await start({ name: n, command: "true" });
  await wait(n, 5);
  const s = status(n) as ReturnType<typeof store.toView>;
  assert.equal(s.name, n);
  assert.equal(s.status, "finished");
  console.log("✓ status returns view");
}

// 9. restart() preserves cwd and command
{
  const n = nameOf("rst");
  await start({ name: n, command: "echo first && exit 7", cwd: "/tmp" });
  await wait(n, 5);
  const r = await restart({ name: n });
  assert.equal(r.name, n);
  const m = store.get(n);
  assert.equal(m?.command, "echo first && exit 7");
  assert.equal(m?.cwd, "/tmp");
  await wait(n, 5);
  console.log("✓ restart preserves cmd/cwd");
}

// 10. wait() throws on timeout
{
  const n = nameOf("to");
  await start({ name: n, command: "sleep 10" });
  let threw = false;
  try { await wait(n, 1); }
  catch (e) { threw = (e as Error).message.includes("timeout"); }
  assert.ok(threw, "wait must throw on timeout");
  await killHard(n);
  console.log("✓ wait throws on timeout");
}

// cleanup
rmSync(tmp, { recursive: true, force: true });
console.log("\nALL OPS TESTS PASSED");
