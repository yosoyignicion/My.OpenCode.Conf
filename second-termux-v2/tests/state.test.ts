// Unit tests for state layer.

import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Isolate state to a tmp dir
const tmp = mkdtempSync(join(tmpdir(), "st-test-"));
process.env.SECOND_TERMUX_STATE_DIR = tmp;

// dynamic import AFTER env override
const paths = await import("../src/state/paths.js");
const store = await import("../src/state/session.js");

// 1. validation
assert.equal(store.isValidName("ok_name-1.x"), true);
assert.equal(store.isValidName(""), false);
assert.equal(store.isValidName("../etc/passwd"), false);
assert.equal(store.isValidName("with space"), false);
console.log("✓ isValidName");

// 2. CRUD
const m = {
  name: "test_a",
  command: "echo hi",
  cwd: "/tmp",
  pid: 1234,
  sid: 1234,
  status: "running" as const,
  started_at: new Date().toISOString(),
  finished_at: null,
  exit_code: null,
  ttl: null,
  tags: ["test"],
  parent: null,
  heal_attempts: 0,
  duration_ms: null,
  host: "test",
};
store.save(m);
const got = store.get("test_a");
assert.equal(got?.name, "test_a");
assert.equal(got?.command, "echo hi");
console.log("✓ save/get");

const patched = store.patch("test_a", { status: "finished", exit_code: 0 });
assert.equal(patched?.status, "finished");
console.log("✓ patch");

const all = store.list();
assert.equal(all.length, 1);
console.log("✓ list");

// 3. view (BEFORE remove)
const v = store.view("test_a");
assert.equal(v?.name, "test_a");
assert.equal(v?.status, "finished");
console.log("✓ view");

// 4. remove
store.remove("test_a");
assert.equal(store.get("test_a"), null);
console.log("✓ remove");

// cleanup
rmSync(tmp, { recursive: true, force: true });
console.log("✓ cleanup");
