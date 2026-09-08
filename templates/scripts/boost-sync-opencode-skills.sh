#!/usr/bin/env bash
# Materialize Boost's app-local Cloud skills at the repository's OpenCode root.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
source="$root/__PHP_ROOT__/.ai/skills"
generated="$root/__BOOST_SKILLS__"
destination="$root/.opencode/skills"
[[ ! -L "$root/.opencode" && ! -L "$destination" ]] || { echo 'boost-sync: destination parent must be a real directory' >&2; exit 1; }
mkdir -p "$destination"
shopt -s nullglob
sources=()
if [[ "$generated" != "$destination" && -d "$generated" ]]; then sources+=("$generated"/*/); fi
if [[ -d "$source" ]]; then sources+=("$source"/*/); fi
[[ ${#sources[@]} -gt 0 ]] || { echo 'boost-sync: generated skill set is empty; run boost:update first' >&2; exit 1; }
for src in "${sources[@]}"; do
    [[ -f "$src/SKILL.md" ]] || { echo "boost-sync: SKILL.md missing in $src" >&2; exit 1; }
done
for src in "${sources[@]}"; do
    name="$(basename "$src")"
    staging="$(mktemp -d "$destination/.boost-sync.XXXXXX")"
    trap 'rm -rf "$staging"' EXIT
    cp -RL "$src/." "$staging/"
    rm -rf "$destination/$name"
    mv "$staging" "$destination/$name"
    trap - EXIT
done
