#!/usr/bin/env bash
# PreToolUse gate for Bash. Blocks the irreversible: recursive delete outside the
# project, force-push, hard reset, history rewrite, and piping the network into a
# shell. Everything else falls through to the normal permission flow.
set -uo pipefail

command_line=$(cat | python3 -c '
import json, sys
try:
    print((json.load(sys.stdin).get("tool_input") or {}).get("command", ""))
except Exception:
    print("")
')

deny() {
  python3 -c '
import json, sys
print(json.dumps({"hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": sys.argv[1],
}}))' "$1"
  exit 0
}

[ -z "$command_line" ] && exit 0

check() { printf '%s' "$command_line" | grep -Eq "$1"; }

check 'rm[[:space:]]+(-[a-zA-Z]*[rR][a-zA-Z]*[[:space:]]+)+(/|~|\$HOME|\*)' \
  && deny "Recursive delete of a root, home or glob path. Name the exact directory instead."
check 'git[[:space:]]+push[[:space:]].*(--force([^-]|$)|-f([[:space:]]|$))' \
  && deny "Force-push rewrites published history. Push a new commit, or ask the user first."
check 'git[[:space:]]+reset[[:space:]]+--hard' \
  && deny "git reset --hard discards uncommitted work. Stash it or commit first."
check 'git[[:space:]]+(filter-branch|filter-repo)|git[[:space:]]+rebase[[:space:]].*(-i|--interactive)' \
  && deny "History rewriting is not run unattended. Ask the user to do it."
check '(curl|wget)[^|]*\|[[:space:]]*(sudo[[:space:]]+)?(ba)?sh' \
  && deny "Piping a download into a shell executes unreviewed code. Download, read, then run."
check 'chmod[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*777' \
  && deny "chmod 777 is never the fix. Grant the narrowest mode that works."

exit 0
