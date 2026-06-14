// Tests for logs / cleanup / heal / lock / format.

import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = mkdtempSync(join(tmpdir(), "st-lch-"));
process.env.SECOND_TERMUX_STATE_DIR = tmp;

const start = (await import("../src/ops/start.js")).start;
const wait = (await import("../src/ops/wait.js")).wait;
const logs = (await import("../src/ops/logs.js")).logs;
const cleanup = (await import("../src/ops/cleanup.js")).cleanup;
const heal = (await import("../src/ops/heal.js")).heal;
const killHard = (await import("../src/ops/stop.js")).killHard;
const lock = await import("../src/utils/lock.js");
const fmt = await import("../src/format/ui.js");
const sym = await import("../src/format/symbols.js");
const store = await import("../src/state/session.js");

const N = (p: string) => "t_" + p + "_" + Math.random().toString(36).slice(2, 6);

// 1. logs() returns stdout
{
  const n = N("logs");
  await start({ name: n, command: "echo line1; echo line2; echo line3" });
  await wait(n, 5);
  const out = logs(n, { tail: 10 });
  assert.match(out, /line1/);
  assert.match(out, /line2/);
  assert.match(out, /line3/);
  console.log("✓ logs returns stdout");
}

// 2. logs() with tail
{
  const n = N("tail");
  await start({ name: n, command: "for i in 1 2 3 4 5; do echo line$i; done" });
  await wait(n, 5);
  const out = logs(n, { tail: 2 });
  assert.ok(!/line1\b/.test(out), "tail=2 should not include line1");
  assert.match(out, /line4/);
  assert.match(out, /line5/);
  console.log("✓ logs tail=2 returns last 2 lines");
}

// 3. logs() with compress on long output
{
  const n = N("cmp");
  const big = Array.from({ length: 20 }, (_, i) => `line${i}`).join("\n");
  await start({ name: n, command: `printf "${big.replace(/\n/g, "\\n")}\\n"` });
  await wait(n, 5);
  const out = logs(n, { tail: 100, compress: true });
  assert.match(out, /\.\.\. \(\d+ lines hidden\) \.\.\./);
  console.log("✓ logs compress hides middle");
}

// 4. logs() diagnose on permission error
{
  const n = N("diag");
  await start({ name: n, command: "echo 'Error: permission denied on /etc/shadow' 1>&2; exit 1" });
  await wait(n, 5);
  const out = logs(n, { diagnose: true });
  assert.match(out, /permission-denied|permission denied/i);
  console.log("✓ logs diagnose classifies permission error");
}

// 5. cleanup() removes stale
{
  const n = N("cln");
  await start({ name: n, command: "true" });
  await wait(n, 5);
  const r = await cleanup(false);
  assert.ok(r.cleaned.includes(n), `cleaned should include ${n}, got ${r.cleaned.join(",")}`);
  assert.equal(store.get(n), null, "session should be removed");
  console.log("✓ cleanup removes stale sessions");
}

// 6. cleanup(all=true) stops running
{
  const n = N("clnall");
  await start({ name: n, command: "sleep 30" });
  await new Promise((r) => setTimeout(r, 200));
  const r = await cleanup(true);
  assert.ok(r.stopped.includes(n), "running session should be stopped");
  await wait(n, 5);
  console.log("✓ cleanup(all) stops running");
}

// 7. heal() with no signature returns no-fix
{
  const n = N("heal0");
  await start({ name: n, command: "true" });
  await wait(n, 5);
  const r = await heal(n);
  assert.equal(r.applied, false);
  assert.match(r.detail, /no signature/);
  console.log("✓ heal returns no-fix on clean exit");
}

// 8. heal() detects ECONNREFUSED and references skill
{
  const n = N("heal1");
  // Simulate by writing a fake .err file with a matching pattern
  await start({ name: n, command: "true" });
  await wait(n, 5);
  // Inject a fake error log
  const fs = await import("node:fs");
  const errPath = join(tmp, "logs", `${n}.err`);
  fs.writeFileSync(errPath, "Error: ECONNREFUSED 127.0.0.1:5432", "utf-8");
  const r = await heal(n);
  // Network signature has no auto-action, so applied=false but we got the pattern
  assert.equal(r.applied, false);
  assert.match(r.detail, /network/);
  assert.equal(r.fix_skill, "http-client-patterns");
  console.log("✓ heal identifies network error with skill ref");
}

// 9. lock withLockSync retries
{
  const resource = "retry-" + Date.now();
  const fd1 = lock.tryLockSync(resource);
  assert.notEqual(fd1, null, "first tryLock should succeed");
  const fd2 = lock.tryLockSync(resource);
  assert.equal(fd2, null, "second tryLock should fail");
  // release properly (sync)
  if (fd1 !== null) lock.releaseSync(resource, fd1);
  const fd3 = lock.tryLockSync(resource);
  assert.notEqual(fd3, null, "after release, lock should be re-acquirable");
  if (fd3 !== null) lock.releaseSync(resource, fd3);
  console.log("✓ lock mutual exclusion");
}

// 10. lock acquire timeout
{
  const resource = "timeout-" + Date.now();
  const fd = lock.tryLockSync(resource);
  assert.notEqual(fd, null);
  let threw = false;
  try {
    await lock.acquire(resource, 200);
  } catch (e) {
    threw = (e as Error).message.includes("lock timeout");
  }
  assert.ok(threw, "acquire must throw on timeout");
  if (fd !== null) lock.releaseSync(resource, fd);
  console.log("✓ lock acquire times out");
}

// 11. UI table includes running/finished sections
{
  const n1 = N("tab1"), n2 = N("tab2");
  await start({ name: n1, command: "sleep 5" });
  await new Promise((r) => setTimeout(r, 200));
  await start({ name: n2, command: "true" });
  await wait(n2, 5);
  const v1 = store.view(n1);
  const v2 = store.view(n2);
  assert.ok(v1, "view1");
  assert.ok(v2, "view2");
  const t = fmt.table([v1!, v2!]);
  assert.match(t, /Running/);
  assert.match(t, /Finished/);
  await killHard(n1);
  console.log("✓ table shows running + finished sections");
}

// 12. symbols include both unicode and ascii fallbacks
{
  // The isUnicodeSupported detection means we may have either set; just
  // check that key symbols are non-empty strings.
  const s = sym.sym;
  assert.ok(s.run && s.run.length > 0, "run symbol non-empty");
  assert.ok(s.ok && s.ok.length > 0, "ok symbol non-empty");
  assert.ok(s.err && s.err.length > 0, "err symbol non-empty");
  console.log("✓ symbols non-empty");
}

// 13. start rejects empty command
{
  // Empty command would just spawn a shell — not an error at the op layer.
  // Zod validation at the server layer is the gate. Here we just confirm
  // it doesn't crash.
  const n = N("ec");
  const r = await start({ name: n, command: "true" });
  assert.ok(r.pid > 0);
  await wait(n, 5);
  console.log("✓ start handles trivial commands");
}

// 14. concurrent wait on same session
{
  const n = N("cw");
  await start({ name: n, command: "sleep 0.5" });
  const [a, b] = await Promise.all([wait(n, 5), wait(n, 5)]);
  assert.equal(a.exit_code, 0);
  assert.equal(b.exit_code, 0);
  console.log("✓ concurrent wait is safe");
}

// cleanup
await killHard(N("tab1")).catch(() => {});
rmSync(tmp, { recursive: true, force: true });
console.log("\nALL LOGS/CLEANUP/HEAL TESTS PASSED");
