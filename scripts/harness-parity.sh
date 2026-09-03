#!/usr/bin/env bash
# Fail if OpenCode artifacts are missing from templates/harness, old trees remain, or a symlink is used.
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

forbid_tree() {
    local path="$1"
    if [[ -e "$path" ]]; then
        fail "retired harness tree still present: ${path}"
    fi
}

need_real_file "${prefix}/opencode.json"
need_real_dir "${prefix}/.opencode"
need_real_dir "${prefix}/.opencode/rules"
need_real_dir "${prefix}/.opencode/skills"
need_real_file "${prefix}/.opencode/agent/adversary.md"
need_real_file "${prefix}/.opencode/skills/creative-mode/SKILL.md"

while IFS= read -r skill; do
    [[ -n "$skill" ]] || continue
    need_real_dir "${prefix}/.opencode/skills/${skill}"
    need_real_file "${prefix}/.opencode/skills/${skill}/SKILL.md"
done < <(find "${prefix}/.opencode/skills" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort)

while IFS= read -r rule; do
    [[ -n "$rule" ]] || continue
    need_real_file "${prefix}/.opencode/rules/${rule}"
done < <(find "${prefix}/.opencode/rules" -maxdepth 1 -name '*.md' -exec basename {} \; | sort)

for retired in .cursor .grok .agents .codex .claude; do
    forbid_tree "${prefix}/${retired}"
done

if leftover="$(find "${prefix}/.opencode" -type l -print)"; then
    if [[ -n "$leftover" ]]; then
        fail "symlink leftover:${leftover//$'\n'/ }"
    fi
fi

for server in laravel-boost mobbin; do
    grep -q "$server" "${prefix}/opencode.json" || fail "${prefix}/opencode.json missing ${server}"
done

grep -q '"instructions"' "${prefix}/opencode.json" || fail "${prefix}/opencode.json missing instructions glob"

echo "harness-parity: ok"
