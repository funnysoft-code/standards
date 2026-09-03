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
need .opencode/rules/product.md
need .opencode/skills/creative-mode/SKILL.md
need .opencode/skills/linear/SKILL.md
need .opencode/agent/adversary.md
need opencode.json
need scripts/boost-sync-opencode-skills.sh
need scripts/lint-commit-msg.sh
need lefthook.yml
need STANDARDS_VERSION
need packages/boost-guidelines/resources/boost/guidelines/core.blade.php
grep -q F7T "$tmp/.opencode/skills/linear/SKILL.md"
grep -q artisan "$tmp/opencode.json"
grep -qv __TEAM__ "$tmp/.opencode/skills/linear/SKILL.md"
node - "$tmp/.opencode/rules/product.md" <<'NODE'
const product = require("fs").readFileSync(process.argv[2], "utf8")
const authority = `Use sources in this order:

1. Product facts and named deviations.
2. Accepted product decisions and design authority.
3. The pinned shared playbook.
4. Inferred code patterns.`

if (!product.includes(authority)) process.exit(1)
for (const contract of [
  "the coordinator asks the owner one focused question",
  "A subagent returns the conflict and smallest unresolved question to the coordinator as blocked",
  "Discover context before loading it broadly",
]) {
  if (!product.includes(contract)) process.exit(1)
}
NODE
node - "$tmp/opencode.json" <<'NODE'
const config = JSON.parse(require("fs").readFileSync(process.argv[2], "utf8"))
for (const key of ["model", "small_model", "provider", "enabled_providers", "disabled_providers"]) {
  if (key in config) process.exit(1)
}
for (const role of ["context-scout", "research-specialist", "implementation-worker"]) {
  if (config.agent && role in config.agent) process.exit(1)
}
NODE
[[ -L "$tmp/.opencode/rules/caveman.md" ]] && { echo symlink; exit 1; }
for retired in .cursor .grok .agents .codex .claude; do
  [[ -e "$tmp/$retired" ]] && { echo "retired tree $retired"; exit 1; }
done

if grep -R -E -n -- '(openai|anthropic|xai|cursor)/[A-Za-z0-9._-]+|^model:[[:space:]]' "$tmp"; then
  echo "personal model or provider leaked into shared harness"
  exit 1
fi

for role in context-scout research-specialist implementation-worker; do
  if grep -R -F -n -- "$role" "$tmp"; then
    echo "global role stamped: $role"
    exit 1
  fi
done

adversary="$tmp/.opencode/agent/adversary.md"
workflow="$tmp/.opencode/rules/workflow.md"
node - "$adversary" "$workflow" <<'NODE'
const fs = require("fs")
const adversary = fs.readFileSync(process.argv[2], "utf8")
const workflow = fs.readFileSync(process.argv[3], "utf8")

for (const contract of [
  "`approve`, `revise`, or `block`",
  "Critical: correctness",
  "High: a defect that would ship broken or incomplete work",
  "Medium: hygiene",
  "Low: optional taste",
  "re-dispatch on the new SHA",
  "A repository verdict names the committed SHA",
  "A machine-local configuration verdict names the complete reviewed source-hash and runtime-identity set",
]) {
  if (!adversary.includes(contract)) process.exit(1)
}
if (!workflow.includes("no Medium or higher findings")) process.exit(1)
NODE
grep -F -q -- 'Only the coordinator may commit and push, and only with owner authorization' "$root/docs/engineering.md"
grep -F -q -- 'Only the coordinator may commit and push, and only with owner authorization' "$tmp/.opencode/skills/linear/SKILL.md"

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
