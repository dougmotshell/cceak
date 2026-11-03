#!/usr/bin/env bash
set -uo pipefail

payload=$(cat) || exit 0
file_path=$(printf '%s' "$payload" | python3 -c '
import json, sys
try:
    ti = json.load(sys.stdin).get("tool_input") or {}
except Exception:
    ti = {}
print(ti.get("file_path") or ti.get("notebook_path") or "")
') || exit 0

deny() {
  python3 -c '
import json, sys
print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": sys.argv[1],
    }
}))' "$1" || true
  exit 0
}

[ -z "$file_path" ] && exit 0

case "$file_path" in
  */.git/*|.git/*)
    deny "Never write inside .git/."
    ;;
  *.env.example|*.env.template)
    ;;
  *.env|*.env.*)
    deny "Environment files hold credentials. Put the key in .env.example with an empty value instead."
    ;;
esac

# The comment requirement avoids matching prose that merely mentions the banner.
if [ -f "$file_path" ] &&
  head -n 12 "$file_path" 2>/dev/null |
    grep -Eq '^[[:space:]]*(<!--|#)[[:space:]]*managed-by:.*sync-ai-surfaces'
then
  deny "$file_path is generated. Edit its source (skills/, .claude/agents/ or .claude/rules/) and run: python3 scripts/sync-ai-surfaces.py"
fi

if printf '%s' "$payload" | python3 -c '
import json, re, sys
try:
    ti = (json.load(sys.stdin).get("tool_input") or {})
except Exception:
    sys.exit(1)
text = "\n".join(
    str(v) for k, v in ti.items()
    if k in ("content", "new_string", "new_source")
)
patterns = (
    r"(?i)\b(api[_-]?key|secret|token|password|passwd|bearer)\b\s*[:=]\s*[\x27\x22]?[A-Za-z0-9/+=_-]{16,}",
    r"-----BEGIN [A-Z ]*PRIVATE KEY-----",
    r"\bAKIA[0-9A-Z]{16}\b",
    r"(?i)\bghp_[A-Za-z0-9]{20,}",
)
sys.exit(0 if any(re.search(pattern, text) for pattern in patterns) else 1)
'; then
  deny "This write looks like it carries a credential. Use \${ENV_VAR} interpolation and keep the value out of the repository."
fi

exit 0