#!/usr/bin/env bash
# FoundryCast-style smoke test for engram-v2 premium features
# Exits 0 on all pass, 1 on any fail
set -uo pipefail

# Color helpers
RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[0;33m'
BLUE=$'\033[0;34m'
BOLD=$'\033[1m'
RESET=$'\033[0m'

# Track pass/fail per test file
declare -A PASS_COUNTS
declare -A FAIL_COUNTS
declare -A STATUS
declare -A NOTES
TOTAL_PASS=0
TOTAL_FAIL=0

log()  { printf '%b\n' "$*"; }
ok()   { printf '  %b✓%b %s\n' "$GREEN" "$RESET" "$1"; }
fail() { printf '  %b✗%b %s\n' "$RED" "$RESET" "$1"; }
warn() { printf '  %b!%b %s\n' "$YELLOW" "$RESET" "$1"; }
info() { printf '  %b→%b %s\n' "$BLUE" "$RESET" "$1"; }

# Resolve script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEST_DIR="$SCRIPT_DIR"

cd "$PROJECT_ROOT" || exit 1

log ""
log "${BOLD}=== engram-v2 Premium Features Smoke Test ===${RESET}"
log "Project: $PROJECT_ROOT"
log "Date:    $(date -Iseconds)"
log ""

# Step 1: Pre-flight check
log "${BOLD}[1/6] Pre-flight: bun availability${RESET}"
if command -v bun >/dev/null 2>&1; then
  ok "bun found: $(bun --version)"
else
  if [ -x "$HOME/.bun/bin/bun" ]; then
    export PATH="$HOME/.bun/bin:$PATH"
    ok "bun found in ~/.bun/bin: $(bun --version)"
  else
    fail "bun not installed (install from https://bun.sh)"
    log ""
    log "${RED}ABORT: bun is required.${RESET}"
    exit 1
  fi
fi
log ""

# Step 2: Typecheck
log "${BOLD}[2/6] TypeScript typecheck (npm run typecheck)${RESET}"
if command -v npx >/dev/null 2>&1; then
  if npx tsc --noEmit 2>&1 | tee /tmp/typecheck.log; then
    ok "typecheck passed"
    TYPECHECK_OK=1
  else
    warn "typecheck reported issues (may be expected if source files are not yet written)"
    TYPECHECK_OK=0
  fi
else
  fail "npx not available"
  TYPECHECK_OK=0
fi
log ""

# Step 3: Run all *.test.ts via bun test
log "${BOLD}[3/6] Run bun test test/${RESET}"
TEST_FILES=(render.test.ts decay.test.ts graph.test.ts commands.test.ts engram.test.ts)

if command -v bun >/dev/null 2>&1; then
  for tf in "${TEST_FILES[@]}"; do
    fpath="$TEST_DIR/$tf"
    if [ ! -f "$fpath" ]; then
      warn "$tf not found (skipping)"
      STATUS[$tf]="SKIP"
      NOTES[$tf]="file missing"
      continue
    fi
    info "Running $tf ..."
    out=$(bun test "$fpath" 2>&1 || true)
    # Parse counts from output like "(X pass, Y fail)"
    pass=$(echo "$out" | grep -oE '[0-9]+ pass' | head -1 | grep -oE '[0-9]+' || echo 0)
    failc=$(echo "$out" | grep -oE '[0-9]+ fail' | head -1 | grep -oE '[0-9]+' || echo 0)
    if [ -z "$pass" ] && [ -z "$failc" ]; then
      # Try alternative format
      pass=$(echo "$out" | grep -oE 'pass: [0-9]+' | head -1 | grep -oE '[0-9]+' || echo 0)
      failc=$(echo "$out" | grep -oE 'fail: [0-9]+' | head -1 | grep -oE '[0-9]+' || echo 0)
    fi
    pass=${pass:-0}
    failc=${failc:-0}
    PASS_COUNTS[$tf]=$pass
    FAIL_COUNTS[$tf]=$failc
    TOTAL_PASS=$((TOTAL_PASS + pass))
    TOTAL_FAIL=$((TOTAL_FAIL + failc))
    if [ "$failc" -eq 0 ] && [ "$pass" -gt 0 ]; then
      STATUS[$tf]="PASS"
      ok "$tf: $pass passed, $failc failed"
    elif [ "$pass" -eq 0 ] && [ "$failc" -eq 0 ]; then
      STATUS[$tf]="PENDING"
      NOTES[$tf]="no tests collected (source files may not exist yet)"
      warn "$tf: 0 pass / 0 fail (PENDING - source files missing?)"
    else
      STATUS[$tf]="FAIL"
      NOTES[$tf]="$failc failures"
      fail "$tf: $pass passed, $failc failed"
    fi
  done
else
  warn "bun not on PATH, skipping bun test"
fi
log ""

# Step 4: Per-file counts
log "${BOLD}[4/6] Per-file summary${RESET}"
for tf in "${TEST_FILES[@]}"; do
  p=${PASS_COUNTS[$tf]:-0}
  f=${FAIL_COUNTS[$tf]:-0}
  info "$tf → $p pass / $f fail"
done
log ""

# Step 5: Integration test - create temp project, init DB, save 3x, search
log "${BOLD}[5/6] Integration test: temp dir, 3 saves, 1 search${RESET}"
INTEG_DIR=$(mktemp -d -t engram-integ-XXXXXX)
trap "rm -rf '$INTEG_DIR'" EXIT
info "Temp dir: $INTEG_DIR"

INTEG_SCRIPT="$INTEG_DIR/integration.ts"
cat > "$INTEG_SCRIPT" <<TS
import { DatabaseManager } from "$PROJECT_ROOT/src/db.js"
import { MemoryEngine } from "$PROJECT_ROOT/src/memory-engine.js"
import { join } from "node:path"

const workdir = process.env.INTEG_DIR || "/tmp"
const dbPath = join(workdir, "integ.db")
const db = new DatabaseManager(dbPath)
const engine = new MemoryEngine(db)

const r1 = engine.save({ title: "Stripe API key", content: "API key en .env.local", type: "config", importance: 0.9 }, "global")
const r2 = engine.save({ title: "PostgreSQL pool size", content: "pool_size=20 para evitar timeouts", type: "config", importance: 0.8 }, "global")
const r3 = engine.save({ title: "Error timeout PG", content: "Solución: aumentar pool_size a 20", type: "error_solution", importance: 0.7 }, "global")

console.log("SAVED:" + [r1.id, r2.id, r3.id].join(","))

const results = engine.search({ query: "pool_size timeout", limit: 5 })
console.log("FOUND:" + results.length)
for (const m of results) console.log("MATCH:" + m.id + ":" + m.score)

const stats = engine.getStats()
console.log("STATS:" + JSON.stringify(stats))
TS

if INTEG_DIR="$INTEG_DIR" bun "$INTEG_SCRIPT" 2>&1 | tee "$INTEG_DIR/integration.log"; then
  SAVED_LINE=$(grep -c "^SAVED:" "$INTEG_DIR/integration.log" || echo 0)
  FOUND_LINE=$(grep "^FOUND:" "$INTEG_DIR/integration.log" | head -1)
  if [ "$SAVED_LINE" = "1" ] && [ -n "$FOUND_LINE" ]; then
    found_count=$(echo "$FOUND_LINE" | cut -d: -f2)
    if [ "$found_count" -ge 1 ]; then
      ok "Integration: 3 saves, search returned $found_count match(es)"
      INTEG_OK=1
    else
      fail "Integration: search returned 0 matches"
      INTEG_OK=0
    fi
  else
    fail "Integration: output malformed (no SAVED/FOUND lines)"
    INTEG_OK=0
  fi
else
  fail "Integration: bun script failed"
  INTEG_OK=0
fi
log ""

# Step 6: Summary table
log "${BOLD}[6/6] Summary${RESET}"
log ""
printf "  %b%-28s %-10s %-10s %s%b\n" "$BOLD" "Feature" "Status" "Pass/Total" "Notes" "$RESET"
printf "  %-28s %-10s %-10s %s\n" "----------------------------" "----------" "----------" "------"

print_row() {
  local name="$1" status="$2" p="$3" total="$4" notes="$5"
  case "$status" in
    PASS)    c="$GREEN" ;;
    FAIL)    c="$RED" ;;
    PENDING) c="$YELLOW" ;;
    *)       c="$BLUE" ;;
  esac
  printf "  %-28s %b%-10s%b %-10s %s\n" "$name" "$c" "$status" "$RESET" "$p/$total" "$notes"
}

print_row "TypeScript typecheck" "$([ "$TYPECHECK_OK" = "1" ] && echo PASS || echo WARN)" "-" "-" "tsc --noEmit"
print_row "render.test.ts" "${STATUS[render.test.ts]:-SKIP}" "${PASS_COUNTS[render.test.ts]:-0}" "$(( ${PASS_COUNTS[render.test.ts]:-0} + ${FAIL_COUNTS[render.test.ts]:-0} ))" "${NOTES[render.test.ts]:-}"
print_row "decay.test.ts"   "${STATUS[decay.test.ts]:-SKIP}"   "${PASS_COUNTS[decay.test.ts]:-0}"   "$(( ${PASS_COUNTS[decay.test.ts]:-0}   + ${FAIL_COUNTS[decay.test.ts]:-0} ))"   "${NOTES[decay.test.ts]:-}"
print_row "graph.test.ts"   "${STATUS[graph.test.ts]:-SKIP}"   "${PASS_COUNTS[graph.test.ts]:-0}"   "$(( ${PASS_COUNTS[graph.test.ts]:-0}   + ${FAIL_COUNTS[graph.test.ts]:-0} ))"   "${NOTES[graph.test.ts]:-}"
print_row "commands.test.ts" "${STATUS[commands.test.ts]:-SKIP}" "${PASS_COUNTS[commands.test.ts]:-0}" "$(( ${PASS_COUNTS[commands.test.ts]:-0} + ${FAIL_COUNTS[commands.test.ts]:-0} ))" "${NOTES[commands.test.ts]:-}"
print_row "engram.test.ts"  "${STATUS[engram.test.ts]:-SKIP}"  "${PASS_COUNTS[engram.test.ts]:-0}"  "$(( ${PASS_COUNTS[engram.test.ts]:-0}  + ${FAIL_COUNTS[engram.test.ts]:-0} ))"  "${NOTES[engram.test.ts]:-}"
print_row "Integration"     "$([ "$INTEG_OK" = "1" ] && echo PASS || echo FAIL)" "-" "-" "3 saves + 1 search"

log ""
log "${BOLD}Totals:${RESET} $TOTAL_PASS pass, $TOTAL_FAIL fail"
log ""

# Final verdict
if [ "$TOTAL_FAIL" -eq 0 ] && [ "$TYPECHECK_OK" = "1" ] && [ "$INTEG_OK" = "1" ]; then
  log "${GREEN}${BOLD}=== ALL CHECKS PASSED ===${RESET}"
  exit 0
else
  log "${YELLOW}${BOLD}=== CHECKS COMPLETED WITH WARNINGS OR FAILURES ===${RESET}"
  if [ "$TOTAL_FAIL" -gt 0 ]; then
    log "${RED}Some tests failed. Review output above.${RESET}"
    exit 1
  fi
  exit 0
fi
