#!/usr/bin/env bash
# Fail if a native tree is missing a process name, or still uses a symlink.
# Usage: scripts/harness-parity.sh
# Checks templates/harness (this repo). Product copies live in templates/scripts.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
prefix="templates/harness"

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

need_real_file "${prefix}/.cursor/mcp.json"
need_real_file "${prefix}/.grok/config.toml"
need_real_file "${prefix}/.codex/config.toml"

while IFS= read -r skill; do
    [[ -n "$skill" ]] || continue
    need_real_dir "${prefix}/.grok/skills/${skill}"
    need_real_file "${prefix}/.grok/skills/${skill}/SKILL.md"
    need_real_dir "${prefix}/.agents/skills/${skill}"
    need_real_file "${prefix}/.agents/skills/${skill}/SKILL.md"
    need_real_dir "${prefix}/.claude/skills/${skill}"
    need_real_file "${prefix}/.claude/skills/${skill}/SKILL.md"
done < <(find "${prefix}/.cursor/skills" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort)

while IFS= read -r rule; do
    [[ -n "$rule" ]] || continue
    [[ "$rule" == "creative-mode" ]] && continue
    need_real_file "${prefix}/.grok/rules/${rule}.md"
    need_real_file "${prefix}/.agents/rules/${rule}.md"
    need_real_file "${prefix}/.claude/rules/${rule}.md"
done < <(find "${prefix}/.cursor/rules" -maxdepth 1 -name '*.mdc' -exec basename {} .mdc \; | sort)

need_real_file "${prefix}/.grok/skills/creative-mode/SKILL.md"
need_real_file "${prefix}/.agents/skills/creative-mode/SKILL.md"
need_real_file "${prefix}/.claude/skills/creative-mode/SKILL.md"
need_real_file "${prefix}/.grok/agents/adversary.md"
need_real_file "${prefix}/.cursor/agents/adversary.md"
need_real_file "${prefix}/.claude/agents/adversary.md"
need_real_file "${prefix}/.agents/skills/adversary/SKILL.md"

if leftover="$(find "${prefix}/.cursor" "${prefix}/.grok" "${prefix}/.agents" "${prefix}/.codex" "${prefix}/.claude" -type l -print)"; then
    if [[ -n "$leftover" ]]; then
        fail "symlink leftover:${leftover//$'\n'/ }"
    fi
fi

for server in laravel-boost mobbin; do
    grep -q "$server" "${prefix}/.cursor/mcp.json" || fail "${prefix}/.cursor/mcp.json missing ${server}"
    grep -q "mcp_servers.${server}" "${prefix}/.grok/config.toml" || fail "${prefix}/.grok/config.toml missing ${server}"
    grep -q "mcp_servers.${server}" "${prefix}/.codex/config.toml" || fail "${prefix}/.codex/config.toml missing ${server}"
done

echo "harness-parity: ok"
