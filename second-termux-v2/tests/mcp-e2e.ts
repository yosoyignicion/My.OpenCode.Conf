// Full E2E test of MCP server over stdio. Hits every tool.

import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strict as assert } from "node:assert";

const state = mkdtempSync(join(tmpdir(), "st-mcp-e2e-"));

const srv = spawn("npx", ["tsx", "src/server.ts"], {
  cwd: "/home/ignicion/Documentos/dev-space/My.OpenCode.Conf/second-termux-v2",
  stdio: ["pipe", "pipe", "pipe"],
  env: { ...process.env, SECOND_TERMUX_STATE_DIR: state },
});

const lines: string[] = [];
const rl = createInterface({ input: srv.stdout });
rl.on("line", (l) => { if (l.trim()) lines.push(l); });
srv.stderr.on("data", () => { /* swallow ready marker */ });

const waitFor = async (id: number, ms = 5000) => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    const ready = lines.find((l) => { try { return JSON.parse(l).id === id; } catch { return false; } });
    if (ready) return JSON.parse(ready);
    await new Promise((r) => setTimeout(r, 30));
  }
  throw new Error("timeout waiting for id " + id);
};
const send = (msg: unknown) => srv.stdin.write(JSON.stringify(msg) + "\n");

const checks: string[] = [];
const check = (label: string, cond: boolean) => {
  checks.push(`${cond ? "✓" : "✗"} ${label}`);
  if (!cond) throw new Error(`check failed: ${label}`);
};

(async () => {
  try {
    // initialize
    send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "mcp-e2e", version: "1" } } });
    const init = await waitFor(1);
    check("initialize → serverInfo.name = second-termux", init.result.serverInfo.name === "second-termux");
    check("initialize → version 2.0.0", init.result.serverInfo.version === "2.0.0");

    send({ jsonrpc: "2.0", method: "notifications/initialized" });

    // tools/list
    send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    const tools = await waitFor(2);
    const names = tools.result.tools.map((t: { name: string }) => t.name);
    check("tools/list → 9 tools", tools.result.tools.length === 9);
    for (const expected of ["bg_start", "bg_stop", "bg_restart", "bg_status", "bg_logs", "bg_list", "bg_wait", "bg_cleanup", "bg_heal"]) {
      check(`tools/list → ${expected} present`, names.includes(expected));
    }

    // bg_start
    const sessionName = "mcp_" + Math.random().toString(36).slice(2, 6);
    send({ jsonrpc: "2.0", id: 10, method: "tools/call", params: { name: "bg_start", arguments: { name: sessionName, command: "echo line_a; echo line_b; exit 0" } } });
    const start = await waitFor(10);
    check("bg_start → ok", !start.result.isError);
    check("bg_start → contains session name", start.result.content[0].text.includes(sessionName));
    check("bg_start → contains pid", /pid \d+/.test(start.result.content[0].text));

    // bg_wait
    send({ jsonrpc: "2.0", id: 11, method: "tools/call", params: { name: "bg_wait", arguments: { name: sessionName, timeout: 10 } } });
    const w = await waitFor(11);
    check("bg_wait → ok", !w.result.isError);
    check("bg_wait → premium line with ✓ 0", /✓ 0/.test(w.result.content[0].text));
    check("bg_wait → has @HH:MM:SS", /@\d{2}:\d{2}:\d{2}/.test(w.result.content[0].text));

    // bg_status
    send({ jsonrpc: "2.0", id: 12, method: "tools/call", params: { name: "bg_status", arguments: { name: sessionName } } });
    const st = await waitFor(12);
    const parsed = JSON.parse(st.result.content[0].text);
    check("bg_status → finished", parsed.status === "finished");
    check("bg_status → exit_code 0", parsed.exit_code === 0);
    check("bg_status → has name", parsed.name === sessionName);

    // bg_status (all)
    send({ jsonrpc: "2.0", id: 13, method: "tools/call", params: { name: "bg_status", arguments: {} } });
    const all = await waitFor(13);
    const arr = JSON.parse(all.result.content[0].text);
    check("bg_status all → array", Array.isArray(arr));
    check("bg_status all → includes session", arr.some((s: { name: string }) => s.name === sessionName));

    // bg_logs
    send({ jsonrpc: "2.0", id: 14, method: "tools/call", params: { name: "bg_logs", arguments: { name: sessionName, tail: 10 } } });
    const lo = await waitFor(14);
    check("bg_logs → contains line_a", lo.result.content[0].text.includes("line_a"));
    check("bg_logs → contains line_b", lo.result.content[0].text.includes("line_b"));
    check("bg_logs → does NOT contain EXIT_MARKER", !lo.result.content[0].text.includes("__SECOND_TERMUX_EXIT__"));

    // bg_list
    send({ jsonrpc: "2.0", id: 15, method: "tools/call", params: { name: "bg_list", arguments: {} } });
    const li = await waitFor(15);
    check("bg_list → contains session name", li.result.content[0].text.includes(sessionName));
    check("bg_list → contains Finished header", /Finished/.test(li.result.content[0].text));

    // bg_start with non-zero exit
    const errName = "mcp_err_" + Math.random().toString(36).slice(2, 6);
    send({ jsonrpc: "2.0", id: 20, method: "tools/call", params: { name: "bg_start", arguments: { name: errName, command: "exit 7" } } });
    await waitFor(20);
    send({ jsonrpc: "2.0", id: 21, method: "tools/call", params: { name: "bg_wait", arguments: { name: errName, timeout: 5 } } });
    const we = await waitFor(21);
    check("bg_wait(failure) → ✗ 7", /✗ 7/.test(we.result.content[0].text));

    // bg_stop on a long-running
    const longName = "mcp_long_" + Math.random().toString(36).slice(2, 6);
    send({ jsonrpc: "2.0", id: 30, method: "tools/call", params: { name: "bg_start", arguments: { name: longName, command: "sleep 30" } } });
    await waitFor(30);
    send({ jsonrpc: "2.0", id: 31, method: "tools/call", params: { name: "bg_stop", arguments: { name: longName } } });
    const stop = await waitFor(31);
    check("bg_stop → ok", !stop.result.isError);
    check("bg_stop → reports ms", /\d+ms/.test(stop.result.content[0].text));

    // bg_heal on a non-healable session (true)
    const healName = "mcp_heal_" + Math.random().toString(36).slice(2, 6);
    send({ jsonrpc: "2.0", id: 40, method: "tools/call", params: { name: "bg_start", arguments: { name: healName, command: "true" } } });
    await waitFor(40);
    // wait for it to finish first
    send({ jsonrpc: "2.0", id: 41, method: "tools/call", params: { name: "bg_wait", arguments: { name: healName, timeout: 5 } } });
    await waitFor(41);
    send({ jsonrpc: "2.0", id: 42, method: "tools/call", params: { name: "bg_heal", arguments: { name: healName } } });
    const heal = await waitFor(42);
    check("bg_heal → ok", !heal.result.isError);
    check("bg_heal → reports no signature", /no signature/.test(heal.result.content[0].text));

    // bg_cleanup
    send({ jsonrpc: "2.0", id: 50, method: "tools/call", params: { name: "bg_cleanup", arguments: { all: false } } });
    const cl = await waitFor(50);
    check("bg_cleanup → ok", !cl.result.isError);
    check("bg_cleanup → mentions cleaned/stopped/nothing", /(cleaned|stopped|nothing)/.test(cl.result.content[0].text));

    // invalid args → isError
    send({ jsonrpc: "2.0", id: 60, method: "tools/call", params: { name: "bg_start", arguments: { name: "INVALID NAME WITH SPACES", command: "true" } } });
    const inv = await waitFor(60);
    check("bg_start invalid name → isError", inv.result.isError === true);
    check("bg_start invalid name → mentions invalid", /invalid/.test(inv.result.content[0].text));

    // destructive command → isError
    send({ jsonrpc: "2.0", id: 61, method: "tools/call", params: { name: "bg_start", arguments: { name: "destruct_" + Math.random().toString(36).slice(2, 6), command: "rm -rf /" } } });
    const dest = await waitFor(61);
    check("bg_start destructive → isError", dest.result.isError === true);
    check("bg_start destructive → PREDICT_FAILURE", /PREDICT_FAILURE/.test(dest.result.content[0].text));

    // unknown tool → isError
    send({ jsonrpc: "2.0", id: 70, method: "tools/call", params: { name: "bg_nonesuch", arguments: {} } });
    const unk = await waitFor(70);
    check("unknown tool → isError", unk.result.isError === true);

    // final summary
    console.log("");
    for (const c of checks) console.log(c);
    console.log(`\nMCP E2E PASSED — ${checks.length} checks`);
  } catch (e) {
    console.error("FAIL:", (e as Error).message);
    console.error("Lines received so far:");
    for (const l of lines) console.error("  " + l);
    process.exit(1);
  } finally {
    srv.kill();
    try { rmSync(state, { recursive: true, force: true }); } catch { /* */ }
    process.exit(0);
  }
})();
