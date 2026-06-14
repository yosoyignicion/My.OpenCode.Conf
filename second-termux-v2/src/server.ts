// MCP server — JSON-RPC 2.0 over stdio. The 10 tools the TUI consumes.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

import { start } from "./ops/start.js";
import { stop, killHard } from "./ops/stop.js";
import { wait } from "./ops/wait.js";
import { status as statusOp, list as listOp } from "./ops/status.js";
import { logs as logsOp } from "./ops/logs.js";
import { cleanup as cleanupOp } from "./ops/cleanup.js";
import { restart as restartOp } from "./ops/restart.js";
import { heal as healOp } from "./ops/heal.js";

import { line, lineHealed } from "./format/premium.js";
import { table } from "./format/ui.js";

import { bridgeEngramOnFinish } from "./bridge/engram.js";
import type { JobResult } from "./state/types.js";

// --- Schemas ---------------------------------------------------------------

const StartSchema = z.object({
  name: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_][a-zA-Z0-9_.-]*$/).describe("Unique session name (alphanumeric, _ . -)"),
  command: z.string().min(1).describe("Shell command to run in background"),
  cwd: z.string().optional().describe("Working directory (default: process cwd)"),
  ttl: z.number().int().positive().optional().describe("Auto-kill after N seconds"),
  tags: z.array(z.string()).optional().describe("Semantic labels (e.g. [\"build\",\"test\"])"),
});

const StopSchema = z.object({
  name: z.string().min(1).describe("Session name"),
  force: z.boolean().optional().default(false).describe("SIGKILL direct (no grace)"),
});

const RestartSchema = z.object({
  name: z.string().min(1).describe("Session name"),
  command: z.string().optional().describe("New command (keeps old if omitted)"),
  cwd: z.string().optional(),
  ttl: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
});

const StatusSchema = z.object({
  name: z.string().optional().describe("Omit for all sessions"),
});

const LogsSchema = z.object({
  name: z.string().min(1).describe("Session name"),
  tail: z.number().int().positive().optional().describe("Last N lines (non-blocking)"),
  compress: z.boolean().optional().default(false).describe("Smart head+tail compression"),
  diagnose: z.boolean().optional().default(false).describe("Extract error signature"),
});

const WaitSchema = z.object({
  name: z.string().min(1).describe("Session name"),
  timeout: z.number().int().positive().optional().describe("Max seconds to wait"),
});

const CleanupSchema = z.object({
  all: z.boolean().optional().default(false).describe("Also stop running sessions"),
});

const HealSchema = z.object({
  name: z.string().min(1).describe("Session name (must be in failed/timed_out/stopped)"),
});

// --- Tool registry ---------------------------------------------------------

interface ToolDef {
  name: string;
  description: string;
  schema: z.ZodTypeAny;
}

const TOOLS: ToolDef[] = [
  { name: "bg_start", description: "Launch a detached background command (survives tool call)", schema: StartSchema },
  { name: "bg_stop", description: "Stop a session — graceful (SIGTERM→SIGKILL) or force (SIGKILL)", schema: StopSchema },
  { name: "bg_restart", description: "Atomic restart: stop+start, preserves command/cwd", schema: RestartSchema },
  { name: "bg_status", description: "Check session status (returns structured JSON)", schema: StatusSchema },
  { name: "bg_logs", description: "Get session stdout/stderr output", schema: LogsSchema },
  { name: "bg_list", description: "List all sessions with status", schema: z.object({}) },
  { name: "bg_wait", description: "Block until a session finishes (emits premium line)", schema: WaitSchema },
  { name: "bg_cleanup", description: "Remove stale (finished) session files", schema: CleanupSchema },
  { name: "bg_heal", description: "Attempt auto-heal of a failed/timed_out session", schema: HealSchema },
];

const toolJsonSchema = (s: z.ZodTypeAny): Record<string, unknown> =>
  zodToJsonSchema(s, { target: "openApi3" }) as Record<string, unknown>;

// --- Server ---------------------------------------------------------------

const server = new Server(
  { name: "second-termux", version: "2.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: toolJsonSchema(t.schema),
  })),
}));

const text = (s: string) => [{ type: "text" as const, text: s }];

function errResult(message: string) {
  return { content: text(`error: ${message}`), isError: true };
}

function okResult(message: string) {
  return { content: text(message) };
}

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  try {
    switch (name) {
      case "bg_start": {
        const a = StartSchema.parse(args);
        const r = await start(a);
        return okResult(`${r.name} started · pid ${r.pid} · @${new Date().toTimeString().slice(0, 8)}`);
      }
      case "bg_stop": {
        const a = StopSchema.parse(args);
        const r = a.force ? await killHard(a.name) : await stop(a.name);
        return okResult(`${r.name} · ${r.status} · ${r.duration_ms}ms`);
      }
      case "bg_restart": {
        const a = RestartSchema.parse(args);
        const r = await restartOp(a);
        return okResult(`${r.name} restarted · pid ${r.pid}`);
      }
      case "bg_status": {
        const a = StatusSchema.parse(args ?? {});
        const data = a.name ? statusOp(a.name) : statusOp();
        return okResult(JSON.stringify(data, null, 2));
      }
      case "bg_logs": {
        const a = LogsSchema.parse(args);
        const out = logsOp(a.name, { tail: a.tail, compress: a.compress, diagnose: a.diagnose });
        return okResult(out);
      }
      case "bg_list": {
        const rows = listOp();
        return okResult(table(rows));
      }
      case "bg_wait": {
        const a = WaitSchema.parse(args);
        const r: JobResult = await wait(a.name, a.timeout ?? 0);
        // Post-finish engram telemetry (fire-and-forget).
        bridgeEngramOnFinish(r).catch(() => { /* */ });
        return okResult(line(r));
      }
      case "bg_cleanup": {
        const a = CleanupSchema.parse(args ?? {});
        const r = await cleanupOp(a.all);
        const parts: string[] = [];
        if (r.stopped.length) parts.push(`stopped: ${r.stopped.join(", ")}`);
        if (r.cleaned.length) parts.push(`cleaned: ${r.cleaned.length} sessions`);
        return okResult(parts.length ? parts.join(" · ") : "nothing to clean");
      }
      case "bg_heal": {
        const a = HealSchema.parse(args);
        const r = await healOp(a.name);
        if (r.applied) {
          return okResult(
            `${lineHealed(a.name, 1)} · fix: ${r.fix_skill ?? r.fix_pattern ?? r.detail}`,
          );
        }
        return okResult(`no fix applied: ${r.detail}`);
      }
      default:
        return errResult(`unknown tool: ${name}`);
    }
  } catch (e) {
    if (e instanceof z.ZodError) {
      return errResult(`invalid args: ${e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
    }
    return errResult((e as Error).message);
  }
});

// --- Bootstrap -------------------------------------------------------------

async function main() {
  process.stdout.setDefaultEncoding("utf-8");
  process.stderr.setDefaultEncoding("utf-8");
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`[second-termux v2.0.0] MCP ready · state=${process.env.SECOND_TERMUX_STATE_DIR ?? "default"}\n`);
}

main().catch((err) => {
  process.stderr.write(`fatal: ${(err as Error).message}\n`);
  process.exit(1);
});

process.on("unhandledRejection", (r) => {
  process.stderr.write(`unhandledRejection: ${String(r)}\n`);
});
process.on("uncaughtException", (e) => {
  process.stderr.write(`uncaughtException: ${e.message}\n`);
  process.exit(1);
});
