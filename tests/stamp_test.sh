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

token_re='__TEAM__|__TEAM_SLUG__|__PRODUCT_BLURB__|__BOOST_ARTISAN__|__DESIGN_ROOT__|__LARAVEL_GLOBS__'
overlay_paths=(
  "$tmp/.cursor"
  "$tmp/.grok"
  "$tmp/.agents"
  "$tmp/.codex"
  "$tmp/.claude"
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
