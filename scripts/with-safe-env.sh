#!/usr/bin/env bash
# with-safe-env.sh — sanitizes terminal env before running a command
# Use case: when host shell inherits TERM=kitty, GPU-accelerated xterm.js
# in VS Code/OpenCode misinterprets basic ANSI from our shims.
# Usage: ./scripts/with-safe-env.sh <command> [args...]
#        ./scripts/with-safe-env.sh st version
#        ./scripts/with-safe-env.sh bun test
set -euo pipefail

export TERM="${TERM_FORCED:-xterm-256color}"
export COLORTERM="${COLORTERM_FORCED:-truecolor}"
export LC_ALL="${LC_ALL_FORCED:-C.UTF-8}"
export LANG="${LANG_FORCED:-C.UTF-8}"

unset KITTY_WINDOW_ID WEZTERM_PANE ALACRITTY_WINDOW_ID 2>/dev/null || true

if [ -n "${VSCODE_IPC_HOOK_CLI:-}" ]; then
  export IN_VSCODE_INTEGRATED_TERMINAL=1
fi

exec "$@"
