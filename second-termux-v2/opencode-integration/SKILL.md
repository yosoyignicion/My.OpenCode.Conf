---
name: second-termux-v2
description: >
  Premium background process orchestrator (v2, MCP-native) for opencode TUI.
  Supersedes legacy `second-termux-processes`. 10 tools (bg_start/bg_stop/
  bg_status/bg_logs/bg_list/bg_wait/bg_restart/bg_cleanup/bg_heal) produce
  a single premium line `✨ <name> ✓ <ec> (N.NNs) @HH:MM:SS` replacing raw
  bash output entirely. XDG state at ~/.local/share/second-termux/.
  Engram-aware (telemetry), predict-failure pre-flight, self-heal (7
  signatures). Triggers: background, bg, segundo plano, nohup, setsid,
  detach, spawn, long running, premium line, zero-token bash, bgx, daemon,
  restart, heal, auto-heal, comando fondo, second termux v2, st.
---

# second-termux v2 — Premium Zero-Token Background Layer (active, supersedes v1)

The single purpose: **make every bash interaction in the TUI show one line, not hundreds**.

## ✨ Always: use MCP, never raw bash

Instead of `bash tool → "npm run build"`, you call:

```
mcp__second-termux__bg_start  { name: "build_x", command: "npm run build", ttl: 1800 }
mcp__second-termux__bg_wait   { name: "build_x", timeout: 120 }
mcp__second-termux__bg_logs   { name: "build_x", tail: 20 }   ← only on failure
```

The TUI shows only the premium line. Full output is in `~/.local/share/second-termux/logs/<name>.out`.

## 🎯 Premium line contract (the only thing in chat)

```
✨ bgx_npm_X7k   ✓ 0  (2.35s) @14:30:01      ← success
🔥 bgx_pytest_aB ✗ 1  (0.50s) @14:31:12      ← failure
⏳ bgx_dev_z9k   …   running (pid 8421)       ← in flight
✦  bgx_X ✓ 0 (auto-sanado en 2.1s, 1 fix)    ← healed
```

## 🧰 Tools (10 — full parity with bgx wrapper)

| Tool | Args | Purpose |
|------|------|---------|
| `bg_start` | `name, command, [cwd], [ttl], [tags]` | Spawn detached via setsid |
| `bg_stop` | `name, [force]` | SIGTERM→SIGKILL or hard |
| `bg_restart` | `name, [command], [cwd], [ttl]` | Atomic stop+start, preserves prior |
| `bg_status` | `[name]` | JSON view (or all) |
| `bg_logs` | `name, [tail], [compress], [diagnose]` | Non-blocking tail |
| `bg_list` | — | Tabular view of all |
| `bg_wait` | `name, [timeout]` | Block until done; emits premium line |
| `bg_cleanup` | `[all]` | GC stale sessions |
| `bg_heal` | `name` | Auto-fix known failure patterns |
| `bg_spawn_args` | alias of `bg_start` | (compat) |

## 🩹 Healing (intelligent)

`bg_heal` recognizes patterns and proposes/applies fixes:

| Signature | Skill referenced | Auto-action |
|-----------|------------------|-------------|
| `ECONNREFUSED / ETIMEDOUT` | `http-client-patterns` | retry with backoff |
| `Module not found` | `pnpm-orm-database` | re-run install |
| `EADDRINUSE` | `load-balancing-algorithms-l4-l7` | fuser -k, re-spawn |
| `permission denied` | `defensive-security-hardening` | chmod +x |
| `out of memory` | `performance-profiling-optimization` | split + raise heap |
| `segfault` | `cpp-memory-safety` | stop, request core dump |

## 🧠 Engram integration

Every finished job is recorded as a `command` engram entry (idempotent, fire-and-forget):
title `cmd:<name>:ec<N>`, importance 0.5 (success) / 0.7 (failure).
See `bridge/engram.ts`. The plugin `engram+zerotoken` indexes the file.

## 🛡 Predict-failure pre-flight

Before spawn, `predictor.ts` scores the command 0..1:
- `>= 0.7` → block (with fix hint)
- `>= 0.4` → warn (visible in TUI)
- `< 0.4` → ok

Destructive patterns (rm -rf /, dd to device, fork bomb, curl|sh) are auto-blocked.

## 📁 State layout (XDG)

```
~/.local/share/second-termux/
├── sessions/<name>.{meta.json,pid,sid,exit,ttl}
├── logs/<name>.{out,err}
├── locks/<name>.lock
├── index.json
├── engram-telemetry.log   ← bridge target
└── heal-audit.log         ← heal attempts
```

## 🚀 Integration with `bgx` wrapper

The legacy `bgx` shell script at `~/.local/bin/bgx` continues to work — it calls
`second-termux start/wait/logs/cleanup` which is now `st start/wait/logs/cleanup`.
No wrapper changes needed.

## 🔌 opencode.jsonc registration

```jsonc
{
  "mcp": {
    "second-termux": {
      "type": "local",
      "command": ["node", "/path/to/second-termux-v2/dist/src/server.js"],
      "enabled": true,
      "timeout": 30000
    }
  }
}
```

(For dev: `["node", "--import", "tsx", "/path/to/second-termux-v2/src/server.ts"]`)

## 📚 Related skills

- `predict-failure-risk` (skills-matrix) — full tríadico risk analysis
- `engram-memory-system` (skills-matrix) — memory schema
- `context7-mcp-docs` (skills-matrix) — for resolving lib-specific commands
- `mcp-tools-protocol` (skills-matrix) — MCP JSON-RPC 2.0 contract
