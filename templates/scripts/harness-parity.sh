#!/usr/bin/env bash
# Fail if a native tree is missing a process name, or still uses a symlink.
# Usage: scripts/harness-parity.sh
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

fail() {
    echo "harness-parity: $1" >&2
    exit 1
}

need_real_file() {
    local path="$1"
    [[ -f "$path" && ! -L "$path" ]] || fail "missing real file ${path}"
}

need_real_dir() {
    local path="$1"
    [[ -d "$path" && ! -L "$path" ]] || fail "missing real directory ${path}"
}

need_real_file .cursor/mcp.json
need_real_file .grok/config.toml
need_real_file .codex/config.toml

boost_json=""
if [[ -f boost.json && ! -L boost.json ]]; then
    boost_json="boost.json"
elif [[ -f services/api/boost.json && ! -L services/api/boost.json ]]; then
    boost_json="services/api/boost.json"
else
    fail "missing real file boost.json"
fi

agents="$(python3 - "$boost_json" <<'PY'
import json, sys
print(",".join(json.load(open(sys.argv[1])).get("agents") or []))
PY
)"
python3 - "$agents" <<'PY' || fail "${boost_json} agents must include codex,cursor,grok_build (got ${agents})"
import sys
got = set(sys.argv[1].split(",")) if sys.argv[1] else set()
if not {"codex", "cursor", "grok_build"}.issubset(got):
    sys.exit(1)
PY

while IFS= read -r skill; do
    [[ -n "$skill" ]] || continue
    need_real_dir ".grok/skills/${skill}"
    need_real_file ".grok/skills/${skill}/SKILL.md"
    need_real_dir ".agents/skills/${skill}"
    need_real_file ".agents/skills/${skill}/SKILL.md"
    need_real_dir ".claude/skills/${skill}"
    need_real_file ".claude/skills/${skill}/SKILL.md"
done < <(find .cursor/skills -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort)

while IFS= read -r rule; do
    [[ -n "$rule" ]] || continue
    [[ "$rule" == "creative-mode" ]] && continue
    need_real_file ".grok/rules/${rule}.md"
    need_real_file ".agents/rules/${rule}.md"
    need_real_file ".claude/rules/${rule}.md"
done < <(find .cursor/rules -maxdepth 1 -name '*.mdc' -exec basename {} .mdc \; | sort)

need_real_file .grok/skills/creative-mode/SKILL.md
need_real_file .agents/skills/creative-mode/SKILL.md
need_real_file .claude/skills/creative-mode/SKILL.md
need_real_file .grok/agents/adversary.md
need_real_file .cursor/agents/adversary.md
need_real_file .claude/agents/adversary.md
need_real_file .agents/skills/adversary/SKILL.md

if leftover="$(find .cursor .grok .agents .codex .claude -type l -print)"; then
    if [[ -n "$leftover" ]]; then
        fail "symlink leftover:${leftover//$'\n'/ }"
    fi
fi

for server in laravel-boost mobbin; do
    grep -q "$server" .cursor/mcp.json || fail ".cursor/mcp.json missing ${server}"
    grep -q "mcp_servers.${server}" .grok/config.toml || fail ".grok/config.toml missing ${server}"
    grep -q "mcp_servers.${server}" .codex/config.toml || fail ".codex/config.toml missing ${server}"
done

echo "harness-parity: ok"
