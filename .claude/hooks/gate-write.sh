#!/usr/bin/env bash
# PreToolUse gate. Blocks a write before it happens:
#   - a generated file (banner `managed-by:`) — edit the source, run the generator
#   - a real environment file (`.env`, `.env.local`; `.env.example` is allowed)
#   - anything inside `.git/`
#   - content that looks like a credential
#
# Exit 0 with a `permissionDecision` JSON: `deny` blocks, silence lets the normal
# permission flow proceed. Never exits non-zero on its own errors — a broken gate
# must not brick the session.
set -uo pipefail

payload=$(cat)

# One field at a time: a path may contain spaces, so never word-split the payload.
file_path=$(printf '%s' "$payload" | python3 -c '
import json, sys
try:
    ti = json.load(sys.stdin).get("tool_input") or {}
except Exception:
    ti = {}
print(ti.get("file_path") or ti.get("notebook_path") or "")
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

[ -z "$file_path" ] && exit 0

case "$file_path" in
  */.git/*|.git/*) deny "Never write inside .git/." ;;
  *.env.example|*.env.template) : ;;
  *.env|*.env.*) deny "Environment files hold credentials. Put the key in .env.example with an empty value instead." ;;
esac

# Generated file: the banner is the contract. HKS-03 exists for exactly this.
# 12 lines, not 5: the banner sits after the frontmatter, which can be several keys
# long. The pattern requires a comment line so prose *mentioning* the banner — as
# AGENTS.md does — never counts as one.
if [ -f "$file_path" ] && head -n 12 "$file_path" 2>/dev/null \
   | grep -Eq '^[[:space:]]*(<!--|#)[[:space:]]*managed-by:.*sync-ai-surfaces'; then
  deny "$file_path is generated. Edit its source (skills/, .claude/agents/ or .claude/rules/) and run: python3 scripts/sync-ai-surfaces.py"
fi

# Credential-shaped content. Deliberately narrow: a long opaque value assigned to a
# credential-shaped name, or a private key header.
if printf '%s' "$payload" | python3 -c '
import json, re, sys
try:
    ti = (json.load(sys.stdin).get("tool_input") or {})
except Exception:
    sys.exit(1)
text = "\n".join(
    str(v) for k, v in ti.items() if k in ("content", "new_string", "new_source")
)
patterns = (
    r"(?i)\b(api[_-]?key|secret|token|password|passwd|bearer)\b\s*[:=]\s*[\x27\x22]?[A-Za-z0-9/+=_-]{16,}",
    r"-----BEGIN [A-Z ]*PRIVATE KEY-----",
    r"\bAKIA[0-9A-Z]{16}\b",
    r"(?i)\bghp_[A-Za-z0-9]{20,}",
)
sys.exit(0 if any(re.search(p, text) for p in patterns) else 1)
'; then
  deny "This write looks like it carries a credential. Use \${ENV_VAR} interpolation and keep the value out of the repository."
fi

exit 0
