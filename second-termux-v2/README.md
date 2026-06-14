# second-termux v2

> **Premium minimalist background process orchestrator for opencode TUI.**
> Zero-token policy · MCP-native · Engram-aware · Self-healing.

## Quick install (one command)

```bash
git clone <your-repo-url> ~/second-termux-v2
cd ~/second-termux-v2
./install.sh
```

That single command will: install npm deps, compile to `dist/`, install
`st`, `second-termux` and `bgx` shims in `~/.local/bin/`, register the
`second-termux` MCP server and the `second-termux-v2` skill in
`~/.config/opencode/opencode.jsonc`, and create the XDG state directory
`~/.local/share/second-termux/`.

Restart your opencode TUI and run `/mcp` — you should see
`context7`, `sqlite`, **`second-termux`**. Type `bgx echo "hello"` and
you'll get the premium line: `✨ bgx_echo_xxx ✓ 0 (0.05s) @HH:MM:SS`.

### Uninstall

```bash
./install.sh --uninstall
```

### Install options

```bash
./install.sh --no-mcp          # install without touching opencode.jsonc
./install.sh --prefix /opt     # install binaries in /opt/.local/bin/
```

### Requirements

- Node.js ≥ 20
- An existing `~/.config/opencode/opencode.jsonc` (run opencode once first)

```
$ npm run st -- start build_x "npm run build" --ttl 1800
started session 'build_x' [pid=8421]

$ npm run st -- wait build_x --timeout 120
✨ build_x ✓ 0 (2.35s) @14:30:01        ← the only line in your TUI
```

Replace **hundreds of lines of raw bash output** with **one premium line**.

---

## What is this?

`second-termux` v2 is the **only background process layer** the opencode TUI needs.
It runs every shell command as a detached, tracked session and surfaces a single
emitter line — `✨ <name> ✓ <ec> (N.NNs) @HH:MM:SS` — to the chat. Full output is
persisted in XDG state and only fetched on demand.

### Why v2?

The legacy `second-termux` (Python, `~/.local/lib/`) had:
- A minimal 8-tool MCP surface (`bg_*`)
- No healing
- A `.out`/`.err`/`.meta.json` per session (good)
- A `bgx` wrapper that depended on a hidden Python tool

v2 is a full **TypeScript rewrite** on top of `@modelcontextprotocol/sdk`,
keeping the proven FS-persisted state layout and adding:

| Feature | v1 (Python) | v2 (TypeScript) |
|---------|-------------|-----------------|
| 10-tool MCP API (`bg_*`) | ✓ | ✓ |
| Detached via `setsid` + exit marker | ✓ | ✓ |
| TTL with auto-kill | ✓ | ✓ |
| FTS5 indexing | ✗ | via Engram bridge |
| Self-healing (`bg_heal`) | ✗ | ✓ (7 signatures) |
| Pre-flight risk gate | ✗ | ✓ (predict-failure) |
| Compressed / diagnosed logs | partial | ✓ |
| Native Node types | ✗ | ✓ strict |
| TUI-zero integration | ✗ | ✓ (skill auto-load) |
| Zero deps in core | ✗ (Python) | ✓ (only `@modelcontextprotocol/sdk` + `zod`) |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    opencode TUI (chat)                        │
│                                                               │
│   Agent ──► mcp__second-termux__bg_start  {name, command}    │
│   Agent ──► mcp__second-termux__bg_wait   {name, timeout}    │
│   Agent ──► mcp__second-termux__bg_logs   {name, tail:20}    │
│                                                               │
│   Premium line (only):  ✨ bgx_npm ✓ 0 (2.35s) @14:30:01     │
└──────────────────────────────┬───────────────────────────────┘
                               │ MCP (stdio, JSON-RPC 2.0)
                               ▼
┌──────────────────────────────────────────────────────────────┐
│   second-termux-v2/src/server.ts                              │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐                 │
│   │  state/  │◄─►│   ops/   │◄─►│ format/  │                 │
│   │  paths   │   │  start   │   │ premium  │                 │
│   │  session │   │  stop    │   │   ui     │                 │
│   │  types   │   │  wait    │   └──────────┘                 │
│   └──────────┘   │  status  │   ┌──────────┐                 │
│                  │  logs    │◄─►│ bridge/  │                 │
│                  │  heal    │   │ predictor│                 │
│                  │  cleanup │   │  engram  │                 │
│                  │  restart │   └──────────┘                 │
│                  └──────────┘                                │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│   State (XDG):  ~/.local/share/second-termux/                 │
│   ├── sessions/<name>.{meta.json,pid,sid,exit,ttl}            │
│   ├── logs/<name>.{out,err}                                   │
│   ├── locks/<name>.lock                                       │
│   ├── engram-telemetry.log  ◄── engram bridge writes here     │
│   └── heal-audit.log                                          │
└──────────────────────────────────────────────────────────────┘
```

---

## Installation

```bash
cd /home/ignicion/Documentos/dev-space/My.OpenCode.Conf/second-termux-v2
npm install
npm run build          # tsc → dist/
```

### opencode integration

In `~/.config/opencode/opencode.jsonc`, the v2 server is auto-wired:

```jsonc
{
  "mcp": {
    "second-termux": {
      "type": "local",
      "command": ["node", "--import", "tsx", "…/second-termux-v2/src/server.ts"],
      "enabled": true
    }
  },
  "skills": {
    "paths": ["…/second-termux-v2/opencode-integration"]
  }
}
```

The skill `second-termux` (in `opencode-integration/SKILL.md`) is auto-loaded by
the TUI. Restart opencode and the tools + skill appear.

---

## Tools (10)

| Tool | Args | Output contract |
|------|------|-----------------|
| `bg_start` | `name, command, [cwd], [ttl], [tags]` | `name started · pid N · @HH:MM:SS` |
| `bg_stop` | `name, [force=false]` | `name · stopped · Nms` |
| `bg_restart` | `name, [command], [cwd], [ttl]` | `name restarted · pid N` |
| `bg_status` | `[name]` | JSON view of one or all |
| `bg_logs` | `name, [tail], [compress=false], [diagnose=false]` | raw or compressed stdout/stderr |
| `bg_list` | — | tabular `Running/Finished` |
| `bg_wait` | `name, [timeout]` | **`✨ <name> ✓ <ec> (N.NNs) @HH:MM:SS`** (premium line) |
| `bg_cleanup` | `[all=false]` | counts of stopped/cleaned |
| `bg_heal` | `name` | `✦ <name> ✓ 0 (auto-sanado en Ns, 1 fix) · fix: <pattern>` |
| `bg_spawn_args` | (compat) | alias of `bg_start` |

---

## Premium line format

The single line that replaces ALL bash output in the TUI:

| Symbol | Meaning |
|--------|---------|
| `✨` | success (exit 0) |
| `🔥` | failure (exit ≠ 0) |
| `⏳` | in flight |
| `✦` | healed (auto-sanado) |
| `✖` | killed |
| `◇` | info / summary |
| `🧹` | cleanup |

```
✨ bgx_npm_X7k   ✓ 0  (2.35s) @14:30:01      ← success
🔥 bgx_pytest_aB ✗ 1  (0.50s) @14:31:12      ← failure
⏳ bgx_dev_z9k   …   running (pid 8421)       ← in flight
✦  bgx_X ✓ 0 (auto-sanado en 2.1s, 1 fix)    ← healed
```

ASCII fallbacks for `TERM=linux` or non-unicode terminals: `[OK]`, `[ERR]`, `[~]`,
`[H]`, `[X]`, `[i]`, `[C]`.

---

## Healing (`bg_heal`)

`bg_heal <name>` reads the session's stderr/stdout, matches against 7 known
signatures, picks a **skills-matrix skill reference**, and (when safe) auto-applies
a fix by spawning a derived session.

| Signature | Skill | Auto-action |
|-----------|-------|-------------|
| `ECONNREFUSED` / `ETIMEDOUT` | [`http-client-patterns`](../skill-matrix/skills-matrix/http-client-patterns/SKILL.md) | retry with backoff |
| `Module not found` | [`prisma-orm-database`](../skill-matrix/skills-matrix/prisma-orm-database/SKILL.md) | re-run install |
| `EADDRINUSE` | [`load-balancing-algorithms-l4-l7`](../skill-matrix/skills-matrix/load-balancing-algorithms-l4-l7/SKILL.md) | `fuser -k PORT`, re-spawn |
| `permission denied` | [`defensive-security-hardening`](../skill-matrix/skills-matrix/defensive-security-hardening/SKILL.md) | `chmod +x` |
| `out of memory` | [`performance-profiling-optimization`](../skill-matrix/skills-matrix/performance-profiling-optimization/SKILL.md) | split, raise heap |
| `timeout exceeded` | [`fault-injection-chaos-engineering`](../skill-matrix/skills-matrix/fault-injection-chaos-engineering/SKILL.md) | raise `--ttl` |
| `segfault` | [`cpp-memory-safety`](../skill-matrix/skills-matrix/cpp-memory-safety/SKILL.md) | stop, request core dump |

Healing engine: [`src/ops/heal.ts`](src/ops/heal.ts). Audit log: `~/.local/share/second-termux/heal-audit.log`.

---

## Engram integration

`second-termux` v2 is **Engram-native**. When `bg_wait` finishes a job, the
`bridge/engram.ts` hook appends a low-importance memory entry to
`~/.local/share/second-termux/engram-telemetry.log`:

```json
{
  "type": "command",
  "title": "cmd:bgx_npm_X7k:ec0",
  "content": "name: bgx_npm_X7k | ec: 0 | duration_ms: 2350 | status: finished | finished_at: 2026-06-14T08:23:58Z",
  "importance": 0.5,
  "scope": "project",
  "tags": ["second-termux", "finished"]
}
```

The [`engram+zerotoken`](../engram+zerotoken) plugin (already wired in
`opencode.jsonc`) auto-indexes this file via FTS5. Failures get `importance: 0.7`
to weight future pre-flight checks.

The contract is **premium minimalist**:
- one log line per finished job
- never blocks the agent
- never throws (fire-and-forget)
- symmetric for success and failure

See [`src/bridge/engram.ts`](src/bridge/engram.ts).

---

## Predict-failure pre-flight

Before every `bg_start`, [`src/bridge/predictor.ts`](src/bridge/predictor.ts)
scores the command 0..1:

| Score | Status | Action |
|-------|--------|--------|
| `>= 0.7` | `block` | refuse spawn, return fix hint |
| `>= 0.4` | `warn` | emit warning, allow spawn |
| `< 0.4`  | `ok`    | silent |

Destructive patterns auto-block: `rm -rf /`, `dd of=/dev/...`, fork bomb,
`curl|sh`. Long commands (>500 chars) auto-warn. Network-sensitive commands
are weighed against past Engram failures (via FTS5 in the full predict-failure-risk
skill; we use a fast local heuristic here for the spawn hot path).

This skill recommends using the
[`predict-failure-risk`](../skill-matrix/skills-matrix/predict-failure-risk/SKILL.md)
matrix skill (tríadico: engram FTS5 + consecutive-failure detection + Context7)
for deeper analysis — see its SKILL.md.

---

## SQLite (state querying)

State is FS-persisted (`.meta.json` per session) for crash safety. For ad-hoc
queries, the MCP `sqlite` tool (already wired in `opencode.jsonc`) can be used
against a small index we expose:

```bash
# The MCP server writes a derived `index.json` to STATE_DIR/index.json
cat ~/.local/share/second-termux/index.json | jq '.[0]'
```

For complex queries, point the `sqlite` MCP at:
- `~/.local/share/second-termux/sessions/` (file-per-row meta.json)
- the parent Engram DB at `~/.config/opencode/data.db` (telemetry rows)

See the recommended `mcp-sqlite` setup in `opencode.jsonc` (already active).

---

## Context7 (lib-aware command resolution)

When you're unsure of the exact command for a library, use the MCP `context7`
tool (already wired). It's the official MCP for fresh docs:

```jsonc
"context7_resolve_library_id" →  { libraryName: "playwright" }
"context7_query_docs"          →  { libraryId: "/microsoft/playwright", query: "npx playwright test command" }
```

Then feed the resolved command to `bg_start`. This is the recommended
**flow**: `context7 → plan → bg_start → bg_wait → premium line`.

---

## CLI (`st`)

```bash
# one-off usage
npx tsx cli/st.ts start build_x "npm run build" --ttl 1800
npx tsx cli/st.ts wait build_x --timeout 120
npx tsx cli/st.ts logs build_x --lines 20
npx tsx cli/st.ts status build_x
npx tsx cli/st.ts list
npx tsx cli/st.ts cleanup --all
npx tsx cli/st.ts heal build_x
```

`st` is a 100% drop-in for the legacy `second-termux` Python binary. The `bgx`
shell wrapper at `~/.local/bin/bgx` keeps working unchanged because it calls
`second-termux start/wait/logs/cleanup` which our CLI aliases exactly.

---

## Tests

```bash
npm test          # unit: state, premium, predictor
npm run smoke     # e2e: real spawn + wait + premium line
```

All green. Type-check clean (`tsc --noEmit` returns 0).

---

## File map

```
second-termux-v2/
├── package.json
├── tsconfig.json
├── README.md                       ← you are here
├── opencode-integration/
│   ├── SKILL.md                    ← loaded by opencode TUI
│   └── opencode.fragment.jsonc     ← config snippet
├── src/
│   ├── server.ts                   ← MCP entrypoint (JSON-RPC 2.0 stdio)
│   ├── state/
│   │   ├── paths.ts                ← XDG layout
│   │   ├── session.ts              ← CRUD over FS
│   │   └── types.ts                ← SessionMeta, SessionView, etc.
│   ├── ops/
│   │   ├── start.ts                ← spawn detached + exit marker
│   │   ├── stop.ts                 ← SIGTERM → SIGKILL
│   │   ├── wait.ts                 ← poll until done
│   │   ├── status.ts               ← structured views
│   │   ├── logs.ts                 ← tail + compress + diagnose
│   │   ├── list.ts                 ← (re-exported from status)
│   │   ├── cleanup.ts              ← GC
│   │   ├── restart.ts              ← atomic stop+start
│   │   └── heal.ts                 ← 7 signatures, auto-fix
│   ├── format/
│   │   ├── symbols.ts              ← unicode/ASCII auto-detect
│   │   ├── premium.ts              ← 1-line contract
│   │   └── ui.ts                   ← tables & notifications
│   ├── bridge/
│   │   ├── predictor.ts            ← risk gate
│   │   └── engram.ts               ← post-finish telemetry
│   └── utils/
│       ├── lock.ts                 ← O_EXCL-based (zero-deps)
│       ├── proc.ts                 ← pidExists, killpg
│       └── exit-marker.ts          ← parse __SECOND_TERMUX_EXIT__=N
├── cli/
│   └── st.ts                       ← bgx-compatible CLI
└── tests/
    ├── run.ts                      ← test runner
    ├── smoke.ts                    ← E2E
    ├── state.test.ts
    ├── premium.test.ts
    └── predictor.test.ts
```

---

## Related skills (skills-matrix)

- [`predict-failure-risk`](../skill-matrix/skills-matrix/predict-failure-risk/SKILL.md) — tríadico risk: engram FTS5 + consecutive-failure + Context7
- [`engram-memory-system`](../skill-matrix/skills-matrix/engram-memory-system/SKILL.md) — full Engram schema
- [`context7-mcp-docs`](../skill-matrix/skills-matrix/context7-mcp-docs/SKILL.md) — Context7 usage
- [`mcp-tools-protocol`](../skill-matrix/skills-matrix/mcp-tools-protocol/SKILL.md) — JSON-RPC 2.0 contract
- [`http-client-patterns`](../skill-matrix/skills-matrix/http-client-patterns/SKILL.md) — retry, circuit-breaker
- [`load-balancing-algorithms-l4-l7`](../skill-matrix/skills-matrix/load-balancing-algorithms-l4-l7/SKILL.md) — port conflict
- [`defensive-security-hardening`](../skill-matrix/skills-matrix/defensive-security-hardening/SKILL.md) — permission errors
- [`performance-profiling-optimization`](../skill-matrix/skills-matrix/performance-profiling-optimization/SKILL.md) — OOM
- [`cpp-memory-safety`](../skill-matrix/skills-matrix/cpp-memory-safety/SKILL.md) — segfault
- [`fault-injection-chaos-engineering`](../skill-matrix/skills-matrix/fault-injection-chaos-engineering/SKILL.md) — timeouts

---

## Migration from v1

| v1 path | v2 path |
|---------|---------|
| `my-opencode/second-termux/index.js` (5 tools) | `second-termux-v2/src/server.ts` (10 tools) |
| `my-opencode/second-termux/data/processes.db` (SQLite) | `~/.local/share/second-termux/sessions/*.meta.json` (FS) |
| `process_spawn`, `process_monitor`… | `bg_start`, `bg_status`… |
| `~/.config/opencode.bak/skills/second-termux/SKILL.md` (legacy) | `second-termux-v2/opencode-integration/SKILL.md` (active) |
| `bgx` wrapper | `bgx` (unchanged, calls `st` underneath) |

The old `my-opencode/second-termux/` was renamed to `my-opencode/second-termux-v2/`
and fully rewritten. The legacy Python at `~/.local/lib/second-termux/` is no
longer referenced — the `st` CLI is the single binary. The `bgx` wrapper at
`~/.local/bin/bgx` keeps working because it spawns `second-termux` from PATH,
which the opencode MCP bridge redirects to the new `st` via the `command` field.

---

## License

MIT — same as opencode. Use freely.
