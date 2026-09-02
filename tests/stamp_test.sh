#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

if ! "$root/scripts/stamp.sh" --target "$tmp" --team F7T --team-slug f7t \
  --product-blurb "Test App" --boost-artisan artisan --design-root design; then
  echo "stamp.sh missing or failed"
  exit 1
fi

need() { [[ -f "$tmp/$1" && ! -L "$tmp/$1" ]] || { echo "missing $1"; exit 1; }; }

need .cursor/rules/caveman.mdc
need .cursor/rules/creative-mode.mdc
need .grok/rules/caveman.md
need .agents/rules/caveman.md
need .claude/rules/caveman.md
need .cursor/skills/linear/SKILL.md
need .claude/skills/linear/SKILL.md
need scripts/harness-parity.sh
need scripts/lint-commit-msg.sh
need lefthook.yml
need STANDARDS_VERSION
grep -q F7T "$tmp/.cursor/skills/linear/SKILL.md"
grep -q artisan "$tmp/.cursor/mcp.json"
grep -qv __TEAM__ "$tmp/.cursor/skills/linear/SKILL.md"
[[ -L "$tmp/.cursor/rules/caveman.mdc" ]] && { echo symlink; exit 1; }
echo "stamp_test: ok"
