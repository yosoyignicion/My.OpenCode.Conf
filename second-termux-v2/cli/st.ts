#!/usr/bin/env node
// `st` — second-termux CLI. Compatible with bgx wrapper contract.
// Usage:
//   st start <name> <command> [--cwd DIR] [--ttl SECONDS]
//   st stop <name>
//   st kill <name>
//   st status [name] [--json]
//   st logs <name> [--lines N] [--compress] [--diagnose]
//   st list [--json]
//   st wait <name> [--timeout SECONDS]
//   st cleanup [--all]
//   st heal <name>
//
// Output is human-friendly; `--json` switches to machine-readable.

import { start } from "../src/ops/start.js";
import { stop, killHard } from "../src/ops/stop.js";
import { wait } from "../src/ops/wait.js";
import { status as statusOp, list as listOp } from "../src/ops/status.js";
import { logs as logsOp } from "../src/ops/logs.js";
import { cleanup as cleanupOp } from "../src/ops/cleanup.js";
import { restart as restartOp } from "../src/ops/restart.js";
import { heal as healOp } from "../src/ops/heal.js";
import { line, lineHealed } from "../src/format/premium.js";
import { table } from "../src/format/ui.js";

interface Arg {
  _: string[];
  [k: string]: string | number | boolean | string[] | undefined;
}

function parseArgs(argv: string[]): Arg {
  const out: Arg = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq >= 0) {
        out[a.slice(2, eq)] = coerce(a.slice(eq + 1));
      } else {
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith("--")) {
          out[a.slice(2)] = coerce(next);
          i++;
        } else {
          out[a.slice(2)] = true;
        }
      }
    } else {
      out._.push(a);
    }
  }
  return out;
}

function coerce(s: string): string | number | boolean {
  if (s === "true") return true;
  if (s === "false") return false;
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  return s;
}

const json = (v: unknown) => console.log(JSON.stringify(v, null, 2));

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];
  const rest = args._.slice(1);

  try {
    switch (cmd) {
      case "start": {
        const name = String(rest[0] ?? "");
        const command = String(rest[1] ?? "");
        if (!name || !command) throw new Error("usage: st start <name> <command> [--cwd DIR] [--ttl SECONDS]");
        const r = await start({
          name,
          command,
          cwd: args.cwd as string | undefined,
          ttl: args.ttl as number | undefined,
          tags: args.tags ? String(args.tags).split(",") : undefined,
        });
        console.log(`started session '${r.name}' [pid=${r.pid}]`);
        break;
      }
      case "stop": {
        const name = String(rest[0] ?? "");
        if (!name) throw new Error("usage: st stop <name>");
        const r = await stop(name);
        console.log(`stopped '${r.name}' (${r.duration_ms}ms)`);
        break;
      }
      case "kill": {
        const name = String(rest[0] ?? "");
        if (!name) throw new Error("usage: st kill <name>");
        const r = await killHard(name);
        console.log(`killed '${r.name}' (${r.duration_ms}ms)`);
        break;
      }
      case "restart": {
        const name = String(rest[0] ?? "");
        if (!name) throw new Error("usage: st restart <name> [new-command]");
        const r = await restartOp({
          name,
          command: rest[1] ? String(rest[1]) : undefined,
          cwd: args.cwd as string | undefined,
          ttl: args.ttl as number | undefined,
        });
        console.log(`restarted '${r.name}' [pid=${r.pid}]`);
        break;
      }
      case "status": {
        const name = rest[0] ? String(rest[0]) : undefined;
        const data = name ? statusOp(name) : statusOp();
        if (args.json) json(data);
        else if (Array.isArray(data)) console.log(table(data));
        else json(data);
        break;
      }
      case "logs": {
        const name = String(rest[0] ?? "");
        if (!name) throw new Error("usage: st logs <name> [--lines N] [--compress] [--diagnose]");
        const out = logsOp(name, {
          tail: args.lines as number | undefined,
          compress: Boolean(args.compress),
          diagnose: Boolean(args.diagnose),
        });
        process.stdout.write(out);
        if (!out.endsWith("\n")) process.stdout.write("\n");
        break;
      }
      case "list": {
        const rows = listOp();
        if (args.json) json(rows);
        else console.log(table(rows));
        break;
      }
      case "wait": {
        const name = String(rest[0] ?? "");
        if (!name) throw new Error("usage: st wait <name> [--timeout SECONDS]");
        const r = await wait(name, (args.timeout as number) ?? 0);
        console.log(line(r));
        break;
      }
      case "cleanup": {
        const r = await cleanupOp(Boolean(args.all));
        if (r.stopped.length) console.log(`stopped: ${r.stopped.join(", ")}`);
        if (r.cleaned.length) console.log(`cleaned: ${r.cleaned.length} sessions`);
        if (!r.stopped.length && !r.cleaned.length) console.log("nothing to clean");
        break;
      }
      case "heal": {
        const name = String(rest[0] ?? "");
        if (!name) throw new Error("usage: st heal <name>");
        const r = await healOp(name);
        if (r.applied) console.log(lineHealed({ name } as any, 1));
        else console.log(`no fix: ${r.detail}`);
        break;
      }
      case "version":
        console.log("second-termux v2.0.0");
        break;
      case "help":
      default:
        console.log(`second-termux v2.0.0 — background process orchestrator

usage:
  st start <name> <command> [--cwd DIR] [--ttl SECONDS] [--tags a,b]
  st stop <name>
  st kill <name>
  st restart <name> [new-command] [--cwd DIR] [--ttl SECONDS]
  st status [name] [--json]
  st logs <name> [--lines N] [--compress] [--diagnose]
  st list [--json]
  st wait <name> [--timeout SECONDS]
  st cleanup [--all]
  st heal <name>
  st version | st help
`);
        break;
    }
  } catch (e) {
    console.error(`error: ${(e as Error).message}`);
    process.exit(1);
  }
}

main();
