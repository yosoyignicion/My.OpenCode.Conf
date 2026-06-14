#!/usr/bin/env bash
# verify.sh — single-source-of-truth verification block for the my-opencode bundle.
# Mirrors AGENTS.md §8. Exits non-zero on any failure.
# Usage: ./scripts/verify.sh        # full
#        ./scripts/verify.sh quick  # skip slow engram tests
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

ok()  { printf "  \033[32m✓\033[0m %s\n" "$*"; }
ko()  { printf "  \033[31m✗\033[0m %s\n" "$*"; FAILED=1; }
info(){ printf "  · %s\n" "$*"; }
hdr() { printf "\n\033[1m── %s ──\033[0m\n" "$*"; }

FAILED=0
MODE="${1:-full}"

# ─────────────────────────────────────────────────────────────────────────────
hdr "1/4 Skill count (filesystem ground truth)"
# ─────────────────────────────────────────────────────────────────────────────
COUNT=$(find skill-matrix/skills-matrix -maxdepth 1 -mindepth 1 -type d 2>/dev/null | wc -l)
if [ "$COUNT" -ge 1 ]; then
  ok "skill folders: $COUNT"
else
  ko "no skill folders under skill-matrix/skills-matrix"
fi

# ─────────────────────────────────────────────────────────────────────────────
hdr "2/4 second-termux-v2 (build + test)"
# ──────────────────────────────────────────────��──────────────────────────────
if [ -d second-termux-v2 ]; then
  ( cd second-termux-v2 && npm run build )      && ok "npm run build"   || ko "npm run build"
  ( cd second-termux-v2 && npm test )           && ok "npm test"        || ko "npm test"
  ( cd second-termux-v2 && npm run typecheck )  && ok "tsc --noEmit"    || ko "tsc --noEmit"
else
  ko "second-termux-v2/ not found"
fi

# ─────────────────────────────────────────────────────────────────────────────
hdr "3/4 engram+zerotoken (typecheck + tests)"
# ─────────────────────────────────────────────────────────────────────────────
if [ -d "engram+zerotoken" ]; then
  ( cd "engram+zerotoken" && npm run typecheck ) && ok "tsc --noEmit"  || ko "tsc --noEmit"
  if [ "$MODE" = "quick" ]; then
    ( cd "engram+zerotoken" && bun test test/engram.test.ts test/commands.test.ts ) \
      && ok "bun test (quick: engram + commands)"  || ko "bun test (quick)"
  else
    ( cd "engram+zerotoken" && bun test test/ ) && ok "bun test test/" || ko "bun test test/"
  fi
else
  ko "engram+zerotoken/ not found"
fi

# ─────────────────────────────────────────────────────────────────────────────
hdr "4/4 MCPs reachable (informational — requires running opencode)"
# ─────────────────────────────────────────────────────────────────────────────
if command -v opencode >/dev/null 2>&1; then
  if opencode mcp list >/dev/null 2>&1; then
    ok "opencode mcp list returned 0 (check output manually for context7/sqlite/second-termux)"
  else
    info "opencode mcp list failed — likely no MCPs configured yet (run README.md 'Prompt maestro')"
  fi
else
  info "opencode not on PATH — skipping MCP connectivity check"
fi

# ─────────────────────────────────────────────────────────────────────────────
hdr "summary"
# ─────────────────────────────────────────────────────────────────────────────
if [ "$FAILED" -eq 0 ]; then
  printf "  \033[32m✓ verify: all checks passed\033[0m\n"
  exit 0
else
  printf "  \033[31m✗ verify: at least one check failed\033[0m\n"
  exit 1
fi
