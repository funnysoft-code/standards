#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
target=""; team=""; team_slug=""; blurb=""; boost="artisan"; design="design"; globs="app/**,routes/**,config/**,database/**,tests/**"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --target) target="$2"; shift 2 ;;
    --team) team="$2"; shift 2 ;;
    --team-slug) team_slug="$2"; shift 2 ;;
    --product-blurb) blurb="$2"; shift 2 ;;
    --boost-artisan) boost="$2"; shift 2 ;;
    --design-root) design="$2"; shift 2 ;;
    --laravel-globs) globs="$2"; shift 2 ;;
    *) echo "unknown $1" >&2; exit 2 ;;
  esac
done
[[ -n "$target" && -n "$team" && -n "$team_slug" && -n "$blurb" ]] || { echo "usage"; exit 2; }
mkdir -p "$target"
version="$(git -C "$root" describe --tags --always)"
copy_tree() {
  local src="$1" dest="$2"
  mkdir -p "$dest"
  if leftover="$(find "$src" -type l -print)"; then
    if [[ -n "$leftover" ]]; then
      echo "stamp: symlink in templates: $leftover" >&2
      exit 1
    fi
  fi
  cp -R "$src"/. "$dest"/
}
copy_tree "$root/templates/harness" "$target"
copy_tree "$root/packages/boost-guidelines" "$target/packages/boost-guidelines"
mkdir -p "$target/scripts" "$target/.github/workflows"
cp "$root/templates/scripts/"* "$target/scripts/"
cp "$root/templates/lefthook.yml" "$target/lefthook.yml"
cp "$root/templates/github/workflows/quality.yml" "$target/.github/workflows/quality.yml"
export team team_slug blurb boost design globs
replace_placeholders() {
  local path="$1"
  if [[ -f "$path" ]]; then
    perl -pi -e 's/__TEAM__/$ENV{team}/g; s/__TEAM_SLUG__/$ENV{team_slug}/g; s/__PRODUCT_BLURB__/$ENV{blurb}/g; s/__BOOST_ARTISAN__/$ENV{boost}/g; s/__DESIGN_ROOT__/$ENV{design}/g; s/__LARAVEL_GLOBS__/$ENV{globs}/g' "$path"
    return
  fi
  [[ -d "$path" ]] || return 0
  find "$path" -type f -print0 | while IFS= read -r -d '' f; do
    perl -pi -e 's/__TEAM__/$ENV{team}/g; s/__TEAM_SLUG__/$ENV{team_slug}/g; s/__PRODUCT_BLURB__/$ENV{blurb}/g; s/__BOOST_ARTISAN__/$ENV{boost}/g; s/__DESIGN_ROOT__/$ENV{design}/g; s/__LARAVEL_GLOBS__/$ENV{globs}/g' "$f"
  done
}
while IFS= read -r -d '' name; do
  replace_placeholders "$target/$(basename "$name")"
done < <(find "$root/templates/harness" -mindepth 1 -maxdepth 1 -print0)
replace_placeholders "$target/scripts"
replace_placeholders "$target/lefthook.yml"
replace_placeholders "$target/.github/workflows/quality.yml"
chmod +x "$target/scripts/"*.sh
printf '%s\n' "$version" > "$target/STANDARDS_VERSION"
echo "stamped $version -> $target"
