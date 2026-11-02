#!/usr/bin/env bash
# PostToolUse feedback. Formats and lints only the file just edited, and hands the
# output back to Claude as context. Never blocks: an edit already happened, and a
# noisy linter must not stall the session.
#
# The sensor commands live in the Makefile, so this hook stays stack-neutral. Fill
# `format-file` and `lint-file` there and this hook starts paying for itself.
set -uo pipefail

file_path=$(cat | python3 -c '
import json, sys
try:
    print((json.load(sys.stdin).get("tool_input") or {}).get("file_path", ""))
except Exception:
    print("")
')

[ -z "$file_path" ] || [ ! -f "$file_path" ] && exit 0
command -v make >/dev/null 2>&1 || exit 0

output=""
for target in format-file lint-file; do
  # Skip a target that does not exist, and a target still on its TODO stub — an
  # unfilled sensor must stay silent instead of nagging after every edit.
  plan=$(make -n "$target" FILE="$file_path" 2>/dev/null) || continue
  case "$plan" in *"TODO: fill"*) continue ;; esac
  result=$(make --no-print-directory "$target" FILE="$file_path" 2>&1) || true
  [ -n "$result" ] && output="${output}${output:+$'\n'}[$target] $result"
done

[ -z "$output" ] && exit 0

python3 -c '
import json, sys
print(json.dumps({"hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": sys.argv[1],
}}))' "$output"
