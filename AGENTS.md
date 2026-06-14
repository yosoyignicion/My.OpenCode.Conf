# AGENTS.md — My.OpenCode.Conf

> Personal opencode distribution. A **config bundle**, not an application: three subprojects glued by a single README prompt, no first-party code at the root, no installer.
>
> **Inherits the dual-agent protocol from** `~/.config/opencode/AGENTS.md` (~424 lines, v3.0, auto-loaded by opencode via `opencode.jsonc → instructions[]`). This file is the **project-specific overlay** — same protocol, scoped commands, paths, traps, and verification. Read both.
>
> **Bundle version**: 2.0.0. See root `README.md` for the changelog narrative.

---

## 0. What this repo is

- **Purpose**: ship a reproducible `~/.config/opencode/` setup as a portable bundle. Cloning + running the "Prompt maestro" from `README.md` reconfigures any opencode install.
- **Three subprojects, no glue code**:
  - `skill-matrix/` — markdown-only catalogue. `skill-matrix/skills-matrix/` holds **250 real `SKILL.md` folders** (+ 1 `00-standard-skill-template/` excluded from the count). Verify with `find` (see §2).
  - `second-termux-v2/` — TypeScript MCP server (`src/`) + 3 CLI shims (`cli/st.ts`, `cli/bgx.ts` → built to `dist/cli/`). Compiled with `tsc` → `dist/`. Hosts `opencode-integration/` (its own SKILL.md + a copyable `opencode.fragment.jsonc` snippet).
  - `engram+zerotoken/` — opencode plugin (no build step). SQLite + FTS5 memory in `bun:sqlite`. Sidecar design doc at `zero-tokens-policy/doc.md`.
- **Root ships only**: `AGENTS.md`, `README.md`, `LICENSE` (MIT), `.gitignore`, `biome.json` (shared linter), `.vscode/settings.json`, `scripts/{with-safe-env.sh,verify.sh,regen-index.mjs}`, `.github/workflows/{export-engram,verify}.yml`. **No `install.sh`**, **no `package.json`**, **no `opencode.json`** at root. The "installer" is the prompt maestro in `README.md`.
- **CI workflows** (2):
  - `.github/workflows/verify.yml` — runs `scripts/verify.sh` + INDEX freshness check on every push/PR.
  - `.github/workflows/export-engram.yml` — on push to `main`, reads `~/.engram/.engram.db` and regenerates `docs/memories.md` (also produces static site at `docs/index.html`). Triggers only if the DB is present in the runner; otherwise writes a stub.

---

## 1. Repo configuration is external

There is **no `opencode.json` at the repo root**. opencode discovers everything via the **global** `~/.config/opencode/opencode.jsonc`, which the prompt maestro patches to point at this repo's subfolders. The canonical snippet (with `<REPO>` placeholder) lives at `second-termux-v2/opencode-integration/opencode.fragment.jsonc`:

| Configured in `opencode.jsonc` | Points to (relative to `<REPO>`) | What it loads |
|---|---|---|
| `skills.paths[]` | `skill-matrix/skills-matrix` | All 250 skill folders, auto-discovered |
| `skills.paths[]` | `second-termux-v2/opencode-integration` | The `second-termux-v2` SKILL.md (on demand) |
| `mcp.context7` | `https://mcp.context7.com/mcp` (remote) | `context7_resolve-library-id`, `context7_query-docs` |
| `mcp.sqlite` | `npx -y mcp-sqlite ./data.db` (local stdio) | 8 `sqlite_*` tools |
| `mcp.second-termux` | `node .../second-termux-v2/dist/src/server.js` (local stdio) | 10 `bg_*` tools |
| `plugin[]` | `engram+zerotoken/src/engram.ts` (`file://` absolute) | Engram memory plugin |
| `instructions[]` | `~/.config/opencode/AGENTS.md` | **Global router — NOT this file** |

This file is **documentation for humans/agents reading the repo**, not a runtime injection. To change what opencode injects at runtime, edit the global AGENTS.md or add to `opencode.jsonc → instructions[]`.

**Per-subproject configs** (loaded only when CWD is the subdir):
- `engram+zerotoken/opencode.json` — loads the engram plugin with `auto_save` + `injection` enabled. **All permissions `deny`** (lockdown). The `instructions: ["AGENTS.md"]` field is a no-op (no AGENTS.md in that subdir by design — the global router covers context).
- `second-termux-v2/opencode-integration/opencode.fragment.jsonc` — MCP snippet ready to copy into a user's `opencode.jsonc` (the prompt maestro handles `<REPO>` substitution).
- `second-termux-v2/biome.json` + `engram+zerotoken/biome.json` — each extends the root `biome.json` via `extends: ["//"]`.

---

## 2. Commands the agent would otherwise guess wrong

> **Package manager**: **`npm` is the verified runner on this system** for both TS subprojects. `pnpm` lockfiles have been **removed** (no value when `pnpm` is not on the host). engram tests must use `bun` (Bun-only, see runtime trap below).
>
> **Linter**: **Biome 1.9+** is the shared linter/formatter. Both subprojects extend the root `biome.json`. Run `biome check .` locally; CI runs it on every push.

| Task | Command | Where |
|---|---|---|
| **Single verification block** (everything) | `./scripts/verify.sh` | root |
| **Quick verification** (skip slow engram tests) | `./scripts/verify.sh quick` | root |
| Regenerate skill INDEX from filesystem | `node scripts/regen-index.mjs` | root |
| Check INDEX is current (CI mode, no writes) | `node scripts/regen-index.mjs --check` | root |
| Build second-termux (TS → JS, also `chmod +x` on the cli bins) | `npm run build` | `second-termux-v2/` |
| Run second-termux tests (8 files via `tsx`) | `npm test` | `second-termux-v2/` |
| Typecheck second-termux | `npm run typecheck` | `second-termux-v2/` |
| Lint/format second-termux | `npm run lint` / `npm run lint:fix` / `npm run format` | `second-termux-v2/` |
| Typecheck engram plugin | `npm run typecheck` (`tsc --noEmit`) | `engram+zerotoken/` |
| Lint/format engram | `npm run lint` / `npm run lint:fix` / `npm run format` | `engram+zerotoken/` |
| Run all engram tests | `bun test test/` | `engram+zerotoken/` |
| Run a single engram test file | `bun test test/<name>.test.ts` | `engram+zerotoken/` |
| Run engram smoke (shell, exercises CLI paths) | `npm run test:smoke` (= `bash test/smoke.sh`) | `engram+zerotoken/` |
| Verify MCP connectivity | `opencode mcp list` | shell |
| Sanity-check second-termux shim | `st version` (must print "second-termux v2.x.x") | shell |
| Premium-line smoke | `bgx echo "smoke"` (must print `✨ ...`) | shell |
| **Ground-truth skill count** (250 real + 1 template) | `find skill-matrix/skills-matrix -maxdepth 1 -mindepth 1 -type d \| wc -l` | root |
| Safe-env wrapper (Kitty/Alacritty/VSC terminals) | `./scripts/with-safe-env.sh <cmd>` | root |

> **Skill count is a moving target.** `skill-matrix/skills-matrix/INDEX.md` is **auto-generated** by `scripts/regen-index.mjs` from the filesystem (the only source of truth). `README.md` and `AGENTS.md §0` say "250" — both reference the regenerated INDEX. Never edit INDEX by hand; never hardcode the count in other places without regenerating.
>
> **Runtime trap**: engram uses `bun:sqlite` exclusively (compiled into bun, no native binding). Do **not** reintroduce `better-sqlite3` — it forces Node + toolchain (`python3`/`make`/`g++`) on every install and is incompatible with bun (oven-sh/bun#4290). Reverting breaks `bun test`.
>
> **`with-safe-env.sh`**: when the host shell inherits `TERM=kitty` (or `wezterm`/`alacritty`), xterm.js in VS Code / OpenCode TUI misinterprets basic ANSI from the shims. The script forces `TERM=xterm-256color`, `COLORTERM=truecolor`, and unsets the offending env vars. Wrap any shim call: `./scripts/with-safe-env.sh st version`. (`.vscode/settings.json` already does this for the integrated terminal.)

---

## 3. Critical paths (outside the repo)

Runtime state lives **outside** the project. Never recreate it inside.

| What | Path | Owner | Notes |
|---|---|---|---|
| Engram global DB | `~/.engram/.engram.db` | engram plugin | Created on first save. Survives any reinstall. |
| opencode config | `~/.config/opencode/opencode.jsonc` | prompt maestro | Timestamped `.bak.YYYYMMDDHHMMSS` on patch. |
| opencode config backups | `~/.config/opencode/opencode.jsonc.bak.*` | prompt maestro | `uninstall` restores the latest one. |
| second-termux state (XDG) | `~/.local/share/second-termux/` | second-termux-v2 | Sessions + logs. |
| second-termux shims | `~/.local/bin/{st,bgx,second-termux}` | second-termux-v2 | 2-line bash scripts invoking `node .../dist/cli/*.js`. Hardcode the repo path. |
| Global router (auto-loaded) | `~/.config/opencode/AGENTS.md` | user | The 424-line dual-agent protocol. |

**Two `.engram/` locations** — easy to confuse:
- `~/.engram/` (above) — the **runtime DB**. Plugin reads/writes it. Used by the CI workflow to generate `docs/memories.md`.
- `engram+zerotoken/.engram/` — a **personal snapshot backup**, not used at runtime. Git-ignored (root `.gitignore` matches `*.db*`). Do not "clean it up."

**Shims vs MCP path**: the MCP `second-termux` uses an **absolute path** in `opencode.jsonc` (not the shims). So if shims break (`st version` fails with `MODULE_NOT_FOUND`), the MCP still says "connected" — the failure is invisible from opencode TUI. Always verify shims with `st version` directly.

---

## 4. Subproject boundaries (who owns what)

| Path | Language | Runtime | Build | Tests |
|---|---|---|---|---|
| `skill-matrix/` | Markdown only | n/a | none | none |
| `second-termux-v2/src/` | TypeScript (ESM) | Node ≥ 20 | `tsc` → `dist/` | `npm test` (tsx, 8 files in `tests/`) |
| `second-termux-v2/cli/` | TypeScript | Node (tsx) | built into `dist/cli/` | sources for `st` / `bgx` shims |
| `engram+zerotoken/src/` | TypeScript (ESM) | **Bun** (`bun:sqlite`) | **no build step** | `bun test test/` (6 `.ts` files) |
| `engram+zerotoken/test/` | bun test + shell | Bun | n/a | 6 `.ts` (`auto-save`, `commands`, `decay`, `engram`, `graph`, `render`) + `smoke.sh`; `engram.test.ts` is the integration suite |
| `engram+zerotoken/zero-tokens-policy/doc.md` | Markdown | n/a | none | none — design doc for token-cost strategy, not a code target |

**Three traps**:
- engram plugin entrypoint is `engram+zerotoken/src/engram.ts`, loaded via the **absolute `file://` path** in the **global** `opencode.jsonc`. The root install does **not** copy it into `~/.config/opencode/`. If the repo is renamed or moved, the global config must be repointed or the plugin silently fails to load.
- Each subproject has its own `package.json` + `tsconfig.json` + `package-lock.json` + `biome.json` (extending root). **No `pnpm` lockfiles** — those were removed in v2.0.0. The root has none either.
- `second-termux-v2/scripts/` (`patch-opencode-config.mjs`, `validate-jsonc.mjs`) — internal helpers invoked by the build/install flow, not for ad-hoc use.

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
- **Regenerate INDEX after adding**: `node scripts/regen-index.mjs` (or run `./scripts/verify.sh`, which fails the check if INDEX is stale).

---

## 7. Common mistakes (anti-patterns)

- **Adding a `package.json` / `install.sh` / `opencode.json` to the root.** The root has no JS. Previous attempts left orphan `node_modules/` and stale installers. Root is shell + markdown + biome config only. The `:global` install scripts in `second-termux-v2/package.json` were removed in v2.0.0 — do not re-add them; the prompt maestro in `README.md` is the only install path.
- **Reintroducing `pnpm` lockfiles.** `pnpm` is not used; lockfiles add noise. v2.0.0 removed all `pnpm-lock.yaml` and `pnpm-workspace.yaml` from the subprojects.
- **Editing `dist/` in second-termux-v2.** Build output. Edit `src/` (or `cli/` for shims), run `npm run build`.
- **Editing `INDEX.md` by hand.** It's auto-generated. Edit `node scripts/regen-index.mjs` or a SKILL.md, then re-run the script.
- **Treating this repo as a single TypeScript project.** It is not. Each subproject is independent with its own lockfile, tsconfig, and biome config (extending root).
- **Running `bun test` in `second-termux-v2/`.** That subproject uses `tsx` (Node), not bun. Use `npm test`.
- **Reintroducing `better-sqlite3` in engram+zerotoken.** Bun cannot dlopen it (oven-sh/bun#4290). Reverting breaks `bun test` and forces Node + toolchain on every install.
- **Trusting prose over filesystem for skill count.** `INDEX.md` is the source of truth (auto-generated). If you hand-write a count, the next regen wipes it.
- **Stale shims in `~/.local/bin/{st,bgx,second-termux}`.** They hardcode the absolute path to the repo. If the repo is renamed or moved, `st version` fails with `MODULE_NOT_FOUND`. **Fix**: rewrite the 3 shims with the new path + `chmod +x`. **Better fix**: use `ln -sf` symlinks to `$(realpath <repo>)/second-termux-v2/dist/cli/{st,bgx}.js` for rename-resilience. The MCP keeps working (it uses `opencode.jsonc`, not the shims), so this failure mode is invisible from opencode TUI.
- **Committing `engram+zerotoken/.engram/`.** Git-ignored (root `.gitignore` matches `*.db*`); `git add -f` would break it. Snapshot is personal backup, not source of truth.
- **Touching `~/.config/opencode/AGENTS.md` from this repo.** The global router is auto-loaded. Edits to it should be deliberate and from the user's global opencode config, not from working in this repo.
- **Running `opencode` with CWD at repo root.** The root has no `opencode.json`, so global config is used (correct). If you `cd` into `engram+zerotoken/`, the per-subdir lockdown takes effect (all permissions `deny`) — be explicit about which CWD you intend.

---

## 8. Verification after any change

The single source of truth is **`./scripts/verify.sh`**. It runs all 4 blocks below in order and exits non-zero on any failure.

```bash
./scripts/verify.sh         # full
./scripts/verify.sh quick   # skip slow engram tests
```

What it does, in order:

1. **Skill count** — `find skill-matrix/skills-matrix -maxdepth 1 -mindepth 1 -type d | wc -l` (must be ≥ 1).
2. **second-termux-v2** — `npm run build` + `npm test` + `npm run typecheck`.
3. **engram+zerotoken** — `npm run typecheck` + `bun test test/` (or just `engram` + `commands` in `quick` mode).
4. **MCP connectivity** — `opencode mcp list` (informational, requires `opencode` on PATH).

CI runs the same script on every push/PR via `.github/workflows/verify.yml`, plus `node scripts/regen-index.mjs --check` to ensure INDEX is current.

A change that breaks (2), (3), or the INDEX check is **not shippable** even if the diff looks fine. (4) is informational.

---

## 9. Where to find what (don't duplicate)

- **Full dual-agent protocol** (Builder/Copilot, sync points, JSON envelopes, anti-patterns) → `~/.config/opencode/AGENTS.md`, auto-loaded via `opencode.jsonc → instructions[]`.
- **Zero-token policy + second-termux tool-selection rule** → same global file, §5 + §5.5. `engram+zerotoken/zero-tokens-policy/doc.md` is a deeper design doc on the same theme (cost model, KV cache maths).
- **Per-MCP-server architecture** (full tool tables, when-to-use examples) → each subproject's `README.md` and `SKILL.md`.
- **Full skill catalogue** → `skill-matrix/skills-matrix/INDEX.md` (auto-generated by `scripts/regen-index.mjs` from filesystem; CI fails if stale).
- **Install / uninstall procedure** → `README.md` as the "Prompt maestro" (8 phases, cross-OS via `uname -s`). No `install.sh` exists — the prompt is the only install path.
- **Troubleshooting** → `README.md` "Troubleshooting" section covers the 6 most common install-time failures.
- **Engram global memory export** (CI-generated) → `docs/memories.md` (and the static site at `docs/index.html`).
- **Linter config** → root `biome.json` (shared) + per-subproject `biome.json` (extending root).
