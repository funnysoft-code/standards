#!/usr/bin/env bash
# Fail if OpenCode artifacts are missing, old harness trees remain, or a symlink is used.
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

forbid_tree() {
    local path="$1"
    if [[ -e "$path" ]]; then
        fail "retired harness tree still present: ${path}"
    fi
}

need_real_file opencode.json
need_real_dir .opencode
need_real_dir .opencode/rules
need_real_dir .opencode/skills
need_real_file .opencode/agent/adversary.md
need_real_file .opencode/skills/creative-mode/SKILL.md

boost_json=""
if [[ -f boost.json && ! -L boost.json ]]; then
    boost_json="boost.json"
elif [[ -f services/api/boost.json && ! -L services/api/boost.json ]]; then
    boost_json="services/api/boost.json"
else
    fail "missing real file boost.json"
fi

while IFS= read -r skill; do
    [[ -n "$skill" ]] || continue
    need_real_dir ".opencode/skills/${skill}"
    need_real_file ".opencode/skills/${skill}/SKILL.md"
done < <(find .opencode/skills -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort)

while IFS= read -r rule; do
    [[ -n "$rule" ]] || continue
    need_real_file ".opencode/rules/${rule}"
done < <(find .opencode/rules -maxdepth 1 -name '*.md' -exec basename {} \; | sort)

for retired in .cursor .grok .agents .codex .claude; do
    forbid_tree "$retired"
done

if leftover="$(find .opencode -type l -print)"; then
    if [[ -n "$leftover" ]]; then
        fail "symlink leftover:${leftover//$'\n'/ }"
    fi
fi

for server in laravel-boost mobbin; do
    grep -q "$server" opencode.json || fail "opencode.json missing ${server}"
done

grep -q '"instructions"' opencode.json || fail "opencode.json missing instructions glob"

echo "harness-parity: ok"
