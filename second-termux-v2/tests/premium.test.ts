// Unit tests for premium formatter.

import { strict as assert } from "node:assert";
import { line, lineFromView, lineHealed, summary } from "../src/format/premium.js";
import type { JobResult, SessionView } from "../src/state/types.js";

const ok: JobResult = { name: "bgx_x", exit_code: 0, duration_ms: 2350, status: "finished" };
const err: JobResult = { name: "bgx_y", exit_code: 1, duration_ms: 500, status: "failed" };

const line1 = line(ok);
assert.match(line1, /bgx_x/);
assert.match(line1, /✓/);
assert.match(line1, /2\.35/);
console.log("✓ line(success)");

const line2 = line(err);
assert.match(line2, /bgx_y/);
assert.match(line2, /✗/);
console.log("✓ line(failure)");

const running: SessionView = {
  name: "bgx_z",
  status: "running",
  pid: 99,
  command: "x",
  exit_code: null,
  started_at: new Date().toISOString(),
  finished_at: null,
  duration_ms: null,
  cwd: "/",
  tags: [],
  heal_attempts: 0,
};
const l3 = lineFromView(running);
assert.match(l3, /running/);
console.log("✓ lineFromView(running)");

const l4 = lineHealed({ name: "bgx_q" } as any, 2);
assert.match(l4, /auto-sanado/);
assert.match(l4, /2 fix/);
console.log("✓ lineHealed");

const s = summary(3, 1, 1);
assert.match(s, /3 sessions/);
console.log("✓ summary");
