#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
tmp="$(mktemp -d)"
keep="$(mktemp -d)"
trap 'rm -rf "$tmp" "$keep"' EXIT

mkdir -p "$tmp/vendor"
printf '%s\n' '<?php echo "__TEAM__";' > "$tmp/vendor/x.php"
printf 'PNG\x89__TEAM__\x00binary' > "$tmp/logo.png"
cp "$tmp/vendor/x.php" "$keep/x.php"
cp "$tmp/logo.png" "$keep/logo.png"

if ! "$root/scripts/stamp.sh" --target "$tmp" --team F7T --team-slug f7t \
  --product-blurb "Test App" --boost-artisan artisan --design-root design; then
  echo "stamp.sh missing or failed"
  exit 1
fi

cmp -s "$keep/x.php" "$tmp/vendor/x.php" || { echo "rewrote vendor/x.php"; exit 1; }
cmp -s "$keep/logo.png" "$tmp/logo.png" || { echo "rewrote PNG"; exit 1; }

need() { [[ -f "$tmp/$1" && ! -L "$tmp/$1" ]] || { echo "missing $1"; exit 1; }; }

need .opencode/rules/caveman.md
need .opencode/skills/creative-mode/SKILL.md
need .opencode/skills/linear/SKILL.md
need .opencode/agent/adversary.md
need opencode.json
need scripts/harness-parity.sh
need scripts/boost-sync-opencode-skills.sh
need scripts/lint-commit-msg.sh
need lefthook.yml
need STANDARDS_VERSION
need packages/boost-guidelines/resources/boost/guidelines/core.blade.php
grep -q F7T "$tmp/.opencode/skills/linear/SKILL.md"
grep -q artisan "$tmp/opencode.json"
grep -qv __TEAM__ "$tmp/.opencode/skills/linear/SKILL.md"
[[ -L "$tmp/.opencode/rules/caveman.md" ]] && { echo symlink; exit 1; }
for retired in .cursor .grok .agents .codex .claude; do
  [[ -e "$tmp/$retired" ]] && { echo "retired tree $retired"; exit 1; }
done

token_re='__TEAM__|__TEAM_SLUG__|__PRODUCT_BLURB__|__BOOST_ARTISAN__|__DESIGN_ROOT__|__LARAVEL_GLOBS__'
overlay_paths=(
  "$tmp/.opencode"
  "$tmp/opencode.json"
  "$tmp/scripts"
  "$tmp/lefthook.yml"
  "$tmp/.github/workflows/quality.yml"
)
for p in "${overlay_paths[@]}"; do
  [[ -e "$p" ]] || { echo "missing overlay $p"; exit 1; }
  if grep -R -E -n -- "$token_re" "$p"; then
    echo "leftover tokens in $p"
    exit 1
  fi
done

echo "stamp_test: ok"
