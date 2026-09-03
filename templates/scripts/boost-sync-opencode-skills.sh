#!/usr/bin/env bash
# Boost writes Cloud skills into .ai/skills and symlinks them into the agent tree.
# Copy them into .opencode/skills so OpenCode loads real files, not Boost's symlink.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
shopt -s nullglob
for src in .ai/skills/*/; do
    name="$(basename "$src")"
    dest=".opencode/skills/${name}"
    rm -rf "$dest"
    cp -R "$src" "$dest"
done
