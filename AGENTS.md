# AGENTS.md — My.OpenCode.Conf

> Personal opencode distribution. A **config bundle**, not an application: three subprojects glued by a single README prompt, no first-party code at the root, no installer.
>
> **Inherits the dual-agent protocol from** `~/.config/opencode/AGENTS.md` (the global router, ~424 lines, auto-loaded by opencode via `opencode.jsonc → instructions[]`). This file is the **project-specific overlay** — same protocol, scoped commands, paths, traps, and verification for this repo. Read both.

---

## 0. What this repo is

- **Purpose**: ship a reproducible `~/.config/opencode/` setup as a portable bundle. Cloning + running the "Prompt maestro" from `README.md` reconfigures any opencode install.
- **Three subprojects, no glue code**:
  - `skill-matrix/` — **250** `SKILL.md` folders under `skill-matrix/skills-matrix/`. Thematic groupings: `auto-healing/` (10 skills), `dev-environment/` (1 skill), plus **13 design skills** alongside the technical ones (iconography, color, motion, badges, etc.). Markdown only, no build.
  - `second-termux-v2/` — TypeScript MCP server + 3 CLI shims (`st`, `bgx`, `second-termux`). `tsc` → `dist/`. Hosts its own `opencode-integration/` (SKILL.md + `opencode.fragment.jsonc` snippet).
  - `engram+zerotoken/` — opencode plugin (no build step). SQLite + FTS5 memory in `bun:sqlite`.
- **Root ships only**: `AGENTS.md`, `README.md`, `LICENSE` (MIT), `.gitignore`, `.vscode/settings.json` (shared editor config), `scripts/with-safe-env.sh`. **No `install.sh`**, **no `package.json`**, **no `opencode.json`** at root. The "installer" is the prompt maestro in `README.md`.

---

## 1. Repo configuration is external — read this first

There is **no `opencode.json` at the repo root**. opencode discovers everything via the **global** `~/.config/opencode/opencode.jsonc`, which the prompt maestro patches to point at this repo's subfolders:

| Configured in `opencode.jsonc` | Points to (relative to repo) | What it loads |
|---|---|---|
| `skills.paths[]` | `skill-matrix/skills-matrix` | All 250 skills, auto-discovered |
| `skills.paths[]` | `second-termux-v2/opencode-integration` | The `second-termux-v2` SKILL.md (on demand) |
| `mcp.context7` | `https://mcp.context7.com/mcp` (remote) | `context7_resolve-library-id`, `context7_query-docs` |
| `mcp.sqlite` | `npx -y mcp-sqlite ./data.db` (local stdio) | 8 `sqlite_*` tools |
| `mcp.second-termux` | `node .../second-termux-v2/dist/src/server.js` (local stdio) | 10 `bg_*` tools |
| `plugin[]` | `engram+zerotoken/src/engram.ts` (file:// absolute) | Engram memory plugin |
| `instructions[]` | `~/.config/opencode/AGENTS.md` | **Global router — NOT this file** |

**Implication**: this file is documentation for **humans/agents reading the repo**, not a runtime injection. To change what opencode injects at runtime, edit `~/.config/opencode/AGENTS.md` or add to `opencode.jsonc → instructions[]`.

**Per-subproject configs** (loaded only when CWD is the subdir):
- `engram+zerotoken/opencode.json` — loads the engram plugin with `auto_save` + `injection` enabled. **All permissions `deny`** (lockdown: grep/glob/webfetch/question/skill/todowrite). The `instructions: ["AGENTS.md"]` field is a no-op (no AGENTS.md in that subdir by design — the global router covers context).
- `second-termux-v2/opencode-integration/opencode.fragment.jsonc` — MCP snippet ready to copy into a user's `opencode.jsonc`.

---

## 2. Commands the agent would otherwise guess wrong

> **Package manager**: **`npm` is the verified runner on this system.** `pnpm v10` is broken (incompatible lockfile format with v9), and `pnpm v9` fails differently — use `npm` for `install` and the project's own scripts for everything else. `pnpm` references in the docs and `pnpm-lock.yaml` files are kept for cross-platform portability; on this host translate to `npm` mentally.

| Task | Command | Where |
|---|---|---|
| Build second-termux (TS → JS) | `npm run build` | `second-termux-v2/` |
| Run second-termux tests (8 files via `tsx`) | `npm test` | `second-termux-v2/` |
| Typecheck engram plugin | `npm run typecheck` (tsc --noEmit) | `engram+zerotoken/` |
| Run all engram tests (5 `.ts` files) | `bun test test/` | `engram+zerotoken/` |
| Run single engram test file | `bun test test/<name>.test.ts` (e.g. `render`, `decay`, `graph`, `commands`, `engram`) | `engram+zerotoken/` |
| Run engram smoke (shell, exercises CLI paths) | `npm run test:smoke` | `engram+zerotoken/` |
| Verify MCP connectivity | `opencode mcp list` | shell |
| Sanity check second-termux shim | `st version` (must print "second-termux v2.0.0") | shell |
| Premium-line smoke | `bgx echo "smoke"` (must print `✨ ...`) | shell |
| Count skills (ground truth) | `find skill-matrix/skills-matrix -maxdepth 1 -mindepth 1 -type d \| wc -l` | root |
| Safe-env wrapper (for Kitty/Alacritty/VSC terminals) | `./scripts/with-safe-env.sh <cmd>` | root |

> **Skill count is a moving target.** README, router footer, and filesystem all disagree. README and `AGENTS.md` §0 say "249"/"250" depending on edit. Run `find` to verify; the catalogue lives at `skill-matrix/skills-matrix/INDEX.md`.

> **Runtime trap**: engram uses `bun:sqlite` exclusively (compiled into bun, no native binding). Do **not** reintroduce `better-sqlite3` — it forces Node + toolchain (python3/make/g++) on every install and is incompatible with bun (oven-sh/bun#4290). Resolved in commit `bfe8141`; reverting would break `bun test`.

> **`with-safe-env.sh`**: when the host shell inherits `TERM=kitty` (or `wezterm`/`alacritty`), xterm.js in VS Code / OpenCode TUI misinterprets basic ANSI from the shims. The script forces `TERM=xterm-256color`, `COLORTERM=truecolor`, and unsets the offending env vars. Wrap any shim call: `./scripts/with-safe-env.sh st version`.

---

## 3. Critical paths (outside the repo)

Runtime state lives **outside the project**. Never recreate it inside.

| What | Path | Owner | Notes |
|---|---|---|---|
| Engram global DB | `~/.engram/.engram.db` | engram plugin | Created on first save. Survives any reinstall. |
| opencode config | `~/.config/opencode/opencode.jsonc` | prompt maestro | Timestamped `.bak.YYYYMMDDHHMMSS` on patch. |
| opencode config backups | `~/.config/opencode/opencode.jsonc.bak.*` | prompt maestro | `uninstall` restores the latest one. |
| second-termux state (XDG) | `~/.local/share/second-termux/` | second-termux-v2 | Sessions + logs. |
| second-termux shims | `~/.local/bin/{st,bgx,second-termux}` | second-termux-v2 | 2-line bash scripts invoking `node .../dist/cli/*.js`. |
| Global router (auto-loaded) | `~/.config/opencode/AGENTS.md` | user | The 424-line dual-agent protocol. |

**Two `.engram/` locations** — easy to confuse:
- `~/.engram/` (above) — the **runtime DB**. Plugin reads/writes it.
- `engram+zerotoken/.engram/` — a **personal snapshot backup**, not used at runtime. Git-ignored via `engram+zerotoken/.gitignore` (line 34). Do not "clean it up."

**Shims vs MCP path**: the MCP `second-termux` uses an **absolute path** in `opencode.jsonc` (not the shims). So if shims break (`st version` fails with `MODULE_NOT_FOUND`), the MCP still says "connected" — the failure is invisible from opencode TUI. Always verify shims with `st version` directly.

---

## 4. Subproject boundaries (who owns what)

| Path | Language | Runtime | Build | Tests |
|---|---|---|---|---|
| `skill-matrix/` | Markdown only | n/a | none | none |
| `second-termux-v2/src/` | TypeScript (ESM) | Node ≥ 20 | `tsc` → `dist/` | `npm test` (tsx, 8 files) |
| `second-termux-v2/tests/` | TypeScript | Node (tsx) | n/a | `run.ts` is the runner; includes `predictor`, `premium`, `state`, `ops`, `logs-cleanup-heal`, `mcp-e2e`, `smoke` |
| `engram+zerotoken/src/` | TypeScript (ESM) | **Bun** (`bun:sqlite`) | **no build step** | `bun test test/` (5 `.ts` files) |
| `engram+zerotoken/test/` | bun test + shell | Bun | n/a | 5 `.ts` + `smoke.sh`; `engram.test.ts` is the integration suite |

**Three traps**:
- engram plugin entrypoint is `engram+zerotoken/src/engram.ts`, loaded via the **absolute `file://` path** in the **global** `opencode.jsonc`. The root install does **not** copy it into `~/.config/opencode/`. If the repo is renamed or moved, the global config must be repointed or the plugin silently fails to load.
- Each subproject has its own `package.json` + `tsconfig.json` + lockfile (`package-lock.json` + `pnpm-lock.yaml` both present). Do **not** hoist or unify them. The root has none.
- `second-termux-v2/.legacy-archive/` — historical snapshot, git-ignored, intentionally preserved on disk. Do not delete.

---

## 5. Engram plugin behaviour (work *with* it, not against)

- **DB**: SQLite + FTS5 with `tokenize='trigram'` (Spanish-friendly partial matching). Schema v2; FTS stays in sync via triggers.
- **Memory types (8)**: `general`, `config`, `architecture`, `error_solution`, `preference`, `learned_pattern`, `conversation`, `command`. Scope: `global` or `project`.
- **Auto-save triggers** (no manual call needed):
  - Keywords: "recuerda que…", "importante:", "no olvides", "ten en cuenta", "persiste"
  - Architecture: "vamos a usar", "la arquitectura es", "decidí usar", "el stack es" → `architecture`, importance 0.9
  - Error→Fix: `error`/`failed`/`traceback` followed by `solucionado`/`fixed`/`funciona` within 5 min → `error_solution`, importance 0.9
- **Decay**: `importance × (1 / (1 + hours_since_update))`. Importance ≥ 0.9 is pinned (no decay).
- **Tools**: `engram_save`, `engram_search`, `engram_forget`, `engram_context`, `engram_status`, `engram_compact`, `engram_graph`, `engram_export`, `engram_diff`.
- **Compaction**: `engram_compact` is **DRY-RUN by default**. Needs `--apply` to actually merge. Lambda 0.2, min_importance 0.1, max_keep 0.7 by default.
- **Title prefix cheatsheet** (use when saving): `ctx7:` reference · `err:`/`fix:` error_solution · `arch:` architecture · `pat:` learned_pattern · `cfg:` config · `pref:` preference.

---

## 6. Skill format (when adding a new one)

- **Path**: `skill-matrix/skills-matrix/<kebab-name>/SKILL.md` (the double-`skill-matrix` is intentional — outer folder hosts router/INDEX, inner hosts SKILLs).
- **Template**: copy `skill-matrix/skills-matrix/00-standard-skill-template/SKILL.md` and fill the 9 sections.
- **Auto-loading**: opencode reads all folders under `skills.paths` in `opencode.jsonc`. No registration step. **Restart opencode TUI** to pick up a new folder — close-and-reopen of the same session is not enough.
- **Keyword trigger routing**: the global router `~/.config/opencode/AGENTS.md` §2.1 maps keywords → skills. Adding a new trigger keyword requires editing that file (this repo's `AGENTS.md` cannot influence runtime routing).

---

## 7. Common mistakes (anti-patterns)

- **Adding a `package.json` / `install.sh` / `opencode.json` to the root.** The root has no JS. Previous attempts left orphan `node_modules/` and stale installers. Root is shell + markdown only.
- **Editing `dist/` in second-termux-v2.** Build output. Edit `src/`, run `npm run build`.
- **Treating this repo as a single TypeScript project.** It is not. Each subproject is independent with its own lockfile and tsconfig.
- **Running `bun test` in `second-termux-v2/`.** That subproject uses `tsx` (Node), not bun. Use `npm test`.
- **Reintroducing `better-sqlite3` in engram+zerotoken.** Bun cannot dlopen it (oven-sh/bun#4290). Was tried, was removed in `bfe8141`. Reverting breaks `bun test` and forces Node + toolchain on every install.
- **Trusting prose over filesystem for skill count.** README, router footer, and filesystem disagree (249/250/228). Always `find`.
- **Stale shims in `~/.local/bin/{st,bgx,second-termux}`.** They hardcode the absolute path to the repo. If the repo is renamed or moved, `st version` fails with `MODULE_NOT_FOUND`. **Fix**: rewrite the 3 shims with the new path + `chmod +x`. **Better fix**: use `ln -sf` symlinks to `$(realpath <repo>)/second-termux-v2/dist/cli/{st,bgx}.js` for rename-resilience. The MCP keeps working (it uses `opencode.jsonc`, not the shims), so this failure mode is invisible from opencode TUI.
- **Committing `engram+zerotoken/.engram/`.** Git-ignored via per-subdir `.gitignore`; `git add -f` would break it. Snapshot is personal backup, not source of truth.
- **Touching `~/.config/opencode/AGENTS.md` from this repo.** The global router is auto-loaded. Edits to it should be deliberate and from the user's global opencode config, not from working in this repo.
- **Running `opencode` with CWD at repo root.** The root has no `opencode.json`, so global config is used (correct). If you `cd` into `engram+zerotoken/`, the per-subdir lockdown takes effect (all permissions `deny`) — be explicit about which CWD you intend.

---

## 8. Verification after any change

```bash
# 1. Skill count stable
find skill-matrix/skills-matrix -maxdepth 1 -mindepth 1 -type d | wc -l
# Expected: 250 (250 SKILL.md folders; do not trust README's "249")

# 2. second-termux builds clean + tests pass
( cd second-termux-v2 && npm run build && npm test )

# 3. engram typechecks + tests
( cd engram+zerotoken && npm run typecheck && bun test test/ )
# Expect: 0 typecheck errors, 63/63 tests pass across 5 files

# 4. All 3 MCPs reachable
opencode mcp list
# Must show: context7 ✓, sqlite ✓, second-termux ✓ all "connected"

# 5. Shims + DB sanity (informational — not blocking)
st version                # "second-termux v2.0.0"
bgx echo "smoke"          # "✨ bgx_… ✓ 0 (…) @HH:MM:SS"
[ -w ~/.engram/ ] && echo "engram DB writable"
```

A change that breaks (1), (2), (3), or (4) is **not shippable** even if the diff looks fine. (5) is informational.

---

## 9. Where to find what (don't duplicate)

- **Full dual-agent protocol** (Builder/Copilot, sync points, JSON envelopes, anti-patterns) → `~/.config/opencode/AGENTS.md`, auto-loaded via `opencode.jsonc → instructions[]`.
- **Zero-token policy + second-termux tool-selection rule** → same global file, §5 + §5.5.
- **Per-MCP-server architecture** (full tool tables, when-to-use examples) → each subproject's `README.md` and `SKILL.md`.
- **Full skill catalogue** → `skill-matrix/skills-matrix/INDEX.md` (auto-generated by extracting `description:` frontmatter from all `SKILL.md`).
- **Install / uninstall procedure** → `README.md` as the "Prompt maestro" (8 phases, cross-OS via `uname -s`).
- **Troubleshooting** → `README.md` "Troubleshooting" section covers the 6 most common install-time failures.
