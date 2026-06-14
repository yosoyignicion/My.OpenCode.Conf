# AGENTS.md — My.OpenCode.Conf

> Personal opencode distribution. A **config bundle**, not an application: three subprojects glued by a single README prompt, no first-party code in the root, no installer.
>
> **Inherits the dual-agent protocol from** `~/.config/opencode/AGENTS.md` (the global router, 424 lines, auto-loaded by opencode via `opencode.jsonc → instructions[]`). This file is the **project-specific overlay**: same protocol, scoped commands, paths, traps, and verification for this repo. Read both — router first for protocol, this file for repo context.

---

## 0. What this repo is

- **Purpose**: ship a reproducible `~/.config/opencode/` setup as a portable bundle. Cloning + running the "Prompt maestro" from `README.md` reconfigures any opencode install.
- **Three subprojects, no glue code**:
  - `skill-matrix/` — 250 skill folders under `skills-matrix/`. Includes the `auto-healing/` thematic subfolder (10 skills: auto-healing-systems, self-healing-infrastructure, circuit-breaker-pattern, auto-scaling-strategies, chaos-engineering, retry-with-backoff, health-checks-liveness-readiness, graceful-shutdown-handling, auto-remediation-runbooks, predictive-failure-detection) and `dev-environment/` (1 skill: auto-binding-rebuild). Design skills (iconography, color, motion, etc., 14 of them) live alongside the rest in the same folder. Hosts the global router `~/.config/opencode/AGENTS.md` (dual-agent protocol v3.0).
  - `second-termux-v2/` — TypeScript MCP server + 3 CLI shims (`st`, `bgx`, `second-termux`). Compiles to `dist/`.
  - `engram+zerotoken/` — opencode plugin (no build step). SQLite+FTS5 memory in `bun:sqlite`.
- **Root ships only**: `AGENTS.md`, `README.md`, `LICENSE` (MIT), `.gitignore`, `.vscode/settings.json` (shared editor config for VS Code users), `scripts/with-safe-env.sh` (sanitizes `$TERM` for the 3 CLI shims when the host shell inherits Kitty/Alacritty). **No `install.sh`**, **no `package.json`**, **no `opencode.json`**.

---

## 1. Repo configuration is external — this is the most-asked fact

There is **no `opencode.json` at the repo root**. opencode discovers everything via the **global** `~/.config/opencode/opencode.jsonc`, which is patched by the prompt maestro to point at this repo's subfolders:

| Configured in `opencode.jsonc` | Points to (relative to repo) | What it loads |
|---|---|---|
| `skills.paths[]` | `skill-matrix/skills-matrix` | All 249 skills, auto-discovered (incl. design + auto-healing) |
| `skills.paths[]` | `second-termux-v2/opencode-integration` | The `second-termux-v2` SKILL.md (loaded on demand) |
| `mcp.context7` | `https://mcp.context7.com/mcp` (remote) | `context7_resolve-library-id`, `context7_query-docs` |
| `mcp.sqlite` | `npx -y mcp-sqlite ./data.db` (local stdio) | 8 sqlite_* tools |
| `mcp.second-termux` | `node .../second-termux-v2/dist/src/server.js` (local stdio) | 10 bg_* tools |
| `instructions[]` | `~/.config/opencode/AGENTS.md` | **Global router (~424 lines), NOT this file** |

**Implication**: this repo's `AGENTS.md` is documentation for **humans/agents reading the repo**, not a runtime injection. To change what opencode injects at runtime, edit `~/.config/opencode/AGENTS.md` (auto-loaded) or add to `opencode.jsonc → instructions[]`.

**Per-subproject configs** (also not auto-loaded from root):
- `engram+zerotoken/opencode.json` — when CWD is that subdir, opencode loads engram plugin with `auto_save` + `injection` enabled, all permissions `deny` (lockdown). It also sets `instructions: ["AGENTS.md"]`, but that subdir has **no** `AGENTS.md` — the field is effectively a no-op there. Do not "fix" it by adding an `AGENTS.md`; the global router already covers context.
- `second-termux-v2/opencode-integration/opencode.fragment.jsonc` — MCP snippet ready to copy into a user's `opencode.jsonc`.

---

## 2. Commands the agent would otherwise guess wrong

> **Package manager**: user prefers **pnpm** over npm for new installs. `pnpm install` / `pnpm run build` work as drop-in replacements in both `second-termux-v2/` and `engram+zerotoken/`. **`pnpm test` only works in `second-termux-v2/`** — for engram, use the bun/tsx split documented below. Legacy `npm` references in docs are kept for back-compat; translate to `pnpm` mentally where it works.

| Task | Command | Where |
|---|---|---|
| Build second-termux (TS → JS) | `pnpm run build` (or `npm run build`) | `second-termux-v2/` |
| Run second-termux tests | `pnpm test` (uses `tsx`, **not bun**) | `second-termux-v2/` |
| Typecheck engram plugin | `pnpm run typecheck` (tsc --noEmit) | `engram+zerotoken/` |
| Run engram tests (bun:sqlite, 4 files) | `bun test test/commands.test.ts test/decay.test.ts test/graph.test.ts test/render.test.ts` | `engram+zerotoken/` |
| Run engram DB test (better-sqlite3, 1 file) | `npx tsx test/engram.test.ts` | `engram+zerotoken/` |
| Run engram smoke (shell) | `bun run test:smoke` | `engram+zerotoken/` |
| Verify MCP connectivity | `opencode mcp list` | shell |
| Sanity check second-termux binary | `bgx echo "smoke"` (must print `✨ ...`) | shell |
| Count skills | `find skill-matrix/skills-matrix -maxdepth 1 -mindepth 1 -type d \| wc -l` | root |
| List active sessions | `st list` | shell |

> **Skill count**: README says 231, router footer says 228, filesystem returns **250** (249 + `auto-binding-rebuild`). Trust `find`, not prose. Catalogue in `skill-matrix/skills-matrix/INDEX.md`.

> **Runtime trap**: engram's `package.json` has `better-sqlite3` under `devDependencies` (tests only) and uses `bun:sqlite` at runtime. The two coexist. Do not "consolidate" them by moving `better-sqlite3` to `dependencies` — that breaks the plugin's `bun`-only runtime assumption. **Also**: `bun` cannot `dlopen` `better-sqlite3` (oven-sh/bun#4290), so `test/engram.test.ts` MUST run with `npx tsx` (Node), not `bun test`. The other 4 test files use `bun:sqlite` and run fine with `bun test`.

> **Native binding rebuild**: if the prebuilt `better-sqlite3` binary is missing for your Node version (e.g. patch versions like 24.16 when maintainer only ships 24.3), rebuild with `sudo apt install -y python3 make g++ && npm rebuild better-sqlite3 --build-from-source` inside `engram+zerotoken/`. Symptom: `Could not locate the bindings file ... compiled/{node}/linux/x64/better_sqlite3.node`.

---

## 3. Critical paths (outside the repo)

Runtime state lives **outside the project**. Never recreate it inside.

| What | Path | Owner | Notes |
|---|---|---|---|
| Engram global DB | `~/.engram/.engram.db` | engram plugin | Created on first save. Survives any reinstall. |
| opencode config | `~/.config/opencode/opencode.jsonc` | prompt maestro | Timestamped `.bak.YYYYMMDDHHMMSS` on patch. |
| opencode config backups | `~/.config/opencode/opencode.jsonc.bak.*` | prompt maestro | `uninstall` restores the latest one. |
| second-termux state (XDG) | `~/.local/share/second-termux/` | second-termux-v2 | Sessions + logs. |
| second-termux shims | `~/.local/bin/{st,bgx,second-termux}` | second-termux-v2 | Symlinks to `dist/cli/*.js`. |
| Global router (auto-loaded) | `~/.config/opencode/AGENTS.md` | user | The 424-line dual-agent protocol. |

**Engram `.engram/` inside `engram+zerotoken/`** is a personal snapshot backup — the plugin does **not** read or write it at runtime. `.gitignore` excludes it, but it is intentionally preserved on disk. Do not "clean it up."

---

## 4. Subproject boundaries (who owns what)

| Path | Language | Runtime | Build | Tests |
|---|---|---|---|---|
| `skill-matrix/` | Markdown only | n/a | none | none |
| `second-termux-v2/src/` | TypeScript (ESM) | Node ≥ 20 | `tsc` → `dist/` | `pnpm test` (tsx) |
| `second-termux-v2/src/bridge/` | TypeScript | Node | compiled | includes `engram.ts` + `predictor.ts` |
| `engram+zerotoken/src/` | TypeScript (ESM) | **Bun** (`bun:sqlite`) | **no build step** | `bun test test/` (6 files) |
| `engram+zerotoken/test/` | bun test + shell | Bun | n/a | includes `smoke.sh` |

**Two traps**:
- engram plugin entrypoint is `engram+zerotoken/src/engram.ts` (204 lines) referenced as `["./src/engram.ts"]` in `engram+zerotoken/opencode.json`. The root install does **not** copy it into `~/.config/opencode/`; opencode reads it from the project path. Relocation breaks the plugin silently.
- Each subproject has its own `package.json` + `tsconfig.json` + lockfile. Do **not** hoist or unify them. The root has none.
- `second-termux-v2/.legacy-archive/` — historical snapshot, ignored by git, intentionally preserved on disk. Do not delete or "clean up."

---

## 5. Engram plugin behaviour (work *with* it, not against)

- **DB**: SQLite + FTS5 with `tokenize='trigram'` (Spanish-friendly partial matching). Schema v2; FTS stays in sync via triggers.
- **Memory types (8)**: `general`, `config`, `architecture`, `error_solution`, `preference`, `learned_pattern`, `conversation`, `command`. Scope: `global` or `project`.
- **Auto-save triggers** (no manual call needed):
  - Keywords: "recuerda que…", "importante:", "no olvides", "ten en cuenta", "persiste"
  - Architecture: "vamos a usar", "la arquitectura es", "decidí usar", "el stack es" → type=`architecture`, importance 0.9
  - Error→Fix: `error`/`failed`/`traceback` followed by `solucionado`/`fixed`/`funciona` within 5 min → type=`error_solution`, importance 0.9
- **Decay**: `importance × (1 / (1 + hours_since_update))`. Importance ≥ 0.9 is pinned (no decay).
- **Tools**: `engram_save`, `engram_search`, `engram_forget`, `engram_context`, `engram_status`, `engram_compact`, `engram_graph`, `engram_export`, `engram_diff`.
- **Compaction**: `engram_compact` is DRY-RUN by default. Needs `--apply` to actually merge. Lambda 0.2, min_importance 0.1, max_keep 0.7 by default.

---

## 6. Skill format (when adding a new one)

- **Path**: `skill-matrix/skills-matrix/<kebab-name>/SKILL.md`
- **Template**: copy `skill-matrix/skills-matrix/00-standard-skill-template/SKILL.md` and fill the 9 sections.
- **Auto-loading**: opencode reads all folders under `skills.paths` in `opencode.jsonc`. No registration step. Restart opencode TUI to pick up a new folder.
- **Keyword trigger routing**: the global router `~/.config/opencode/AGENTS.md` §2.1 maps keywords → skills. Adding a new trigger keyword requires editing that file.

---

## 7. Common mistakes (anti-patterns to avoid in this repo)

- **Adding a `package.json` / `install.sh` / `opencode.json` to the root.** The root has no JS. Previous attempts left orphan `node_modules/`/stale installers. Root is shell + markdown only. The "installer" is the prompt maestro in `README.md`.
- **Editing `dist/` in second-termux-v2.** Build output. Edit `src/`, run `pnpm run build`.
- **Treating this repo as a single TypeScript project.** It is not. Each subproject is independent.
- **Committing `engram+zerotoken/.engram/`.** Already git-ignored, but `git add -f` would break it. Snapshot is a personal backup, not source of truth.
- **Running `bun test` in second-termux-v2.** Uses `tsx`, not bun. `pnpm test` (or `npm test`) is correct there.
- **Running `bun test` over all of `engram+zerotoken/test/`.** `engram.test.ts` imports `better-sqlite3` (Node-only); bun cannot dlopen it (oven-sh/bun#4290). Run that file with `npx tsx test/engram.test.ts` (Node). The other 4 files are bun-only. **Also**: `npm test` (delegates to `bun test test/`) is therefore broken until `engram.test.ts` is refactored to use `bun:sqlite` or the bun issue is closed.
- **Trusting prose over filesystem for skill count.** README, router footer, and filesystem disagree (228/231/249). Always run `find`.

---

## 8. Verification after any change

```bash
# 1. Skill count unchanged (≥ 230)
find skill-matrix/skills-matrix -maxdepth 1 -mindepth 1 -type d | wc -l
# Expected: 250 (incl. auto-healing + dev-environment thematic folders, design skills consolidated)

# 2. second-termux builds clean + tests pass
( cd second-termux-v2 && pnpm run build && pnpm test )

# 3. engram typechecks + tests
( cd engram+zerotoken && pnpm run typecheck && bun test test/commands.test.ts test/decay.test.ts test/graph.test.ts test/render.test.ts && npx tsx test/engram.test.ts )

# 4. All 3 MCPs reachable
opencode mcp list   # must show context7, sqlite, second-termux all "connected"

# 5. Binaries + DB sanity
st version          # "second-termux v2.0.0"
bgx echo "smoke"    # "✨ bgx_… ✓ 0 (…) @HH:MM:SS"
[ -w ~/.engram/ ]   # exit 0
```

A change that breaks any of (1), (2), (3), (4) is **not shippable** even if the diff looks fine. (5) is informational.

---

## 9. What this file deliberately does NOT contain

- The full dual-agent protocol (Builder/Copilot, sync points, JSON envelopes, anti-patterns) — lives in `~/.config/opencode/AGENTS.md` and is auto-loaded by opencode via `instructions` in `opencode.jsonc`. **Do not duplicate.**
- The zero-token policy + second-termux MCP tool-selection rule — same global file, §5 + §5.5.
- Per-MCP-server architecture details (full tool tables, when-to-use examples) — lives in each subproject's own `README.md` and `SKILL.md`.
- The full skill catalogue — lives in the 250 `SKILL.md` files (index at `skill-matrix/skills-matrix/INDEX.md`). This file only references the template.
- The "how to install" procedure — lives in `README.md` as the "Prompt maestro" (8 phases, cross-OS via `uname -s` detection).

**This file's job**: the orientation map an agent needs on day 1 of working in this repo — what commands, what paths, what to avoid, what to verify. Nothing more. For deep dives, follow the references.
