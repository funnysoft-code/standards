#!/usr/bin/env bash
# Materialize and format Boost artifacts before replacing any original files.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
php_root="$root/__PHP_ROOT__"
php_root="${php_root%/.}"
source="$php_root/.ai/skills"
generated="$root/__BOOST_SKILLS__"
destination="$root/.opencode/skills"
real_parents() {
    local cursor="$1"
    while [[ "$cursor" != "$root" ]]; do
        [[ ! -L "$cursor" ]] || { echo "boost-sync: symlink root or parent: $cursor" >&2; return 1; }
        cursor="$(dirname "$cursor")"
    done
}
for directory in "$generated" "$source" "$destination"; do real_parents "$directory"; done
shopt -s nullglob
sources=("$generated"/* "$source"/*)
[[ ${#sources[@]} -gt 0 ]] || { echo 'boost-sync: generated skill set is empty; run boost:update first' >&2; exit 1; }
for src in "${sources[@]}"; do
    [[ -d "$src" && -f "$src/SKILL.md" ]] || { echo "boost-sync: SKILL.md missing in $src" >&2; exit 1; }
done
metadata=()
for directory in "$root" "$php_root"; do
    for file in "$directory/AGENTS.md" "$directory/boost.json"; do
        real_parents "$file"
        [[ ! -f "$file" ]] || metadata+=("$file")
    done
    [[ "$root" != "$php_root" ]] || break
done
formatter=()
if [[ -x "$root/node_modules/.bin/oxfmt" ]]; then formatter=("$root/node_modules/.bin/oxfmt")
elif [[ -x "$root/node_modules/.bin/vp" ]]; then formatter=("$root/node_modules/.bin/vp" fmt)
else echo 'boost-sync: formatter missing; install locked JS dev dependencies (oxfmt or vp)' >&2; exit 1
fi
staging="$(mktemp -d "$root/.boost-sync.XXXXXX")"
trap 'rm -rf "$staging"' EXIT
mkdir "$staging/sources" "$staging/destination" "$staging/metadata"
cd "$root"
format_file() {
    "${formatter[@]}" --stdin-filepath "$2" < "$1" > "$staging/formatted"
    cat "$staging/formatted" > "$1"
}
format_tree() {
    local file
    while IFS= read -r -d '' file; do
        case "$file" in
            *.md|*.mdx|*.json|*.jsonc|*.yml|*.yaml|*.js|*.mjs|*.cjs|*.jsx|*.ts|*.mts|*.cts|*.tsx|*.css|*.html)
                format_file "$file" "$2/${file#"$1/"}"
                ;;
        esac
    done < <(find "$1" -type f -print0)
}
# Dereference individual skill links, including nested references, into staging.
# Validate and format every source before changing sources, destinations or briefs.
for ((i=0; i<${#sources[@]}; i++)); do
    src="${sources[$i]%/}"
    name="$(basename "$src")"
    cp -RL "$src" "$staging/sources/$i"
    format_tree "$staging/sources/$i" "$src"
    rm -rf "$staging/destination/$name"
    cp -R "$staging/sources/$i" "$staging/destination/$name"
done
format_tree "$staging/destination" "$destination"
for ((i=0; i<${#metadata[@]}; i++)); do
    cp "${metadata[$i]}" "$staging/metadata/$i"
    format_file "$staging/metadata/$i" "${metadata[$i]}"
done
for ((i=0; i<${#sources[@]}; i++)); do
    src="${sources[$i]%/}"
    [[ "$(dirname "$src")" != "$destination" ]] || continue
    rm -rf "$src"
    mv "$staging/sources/$i" "$src"
done
mkdir -p "$destination"
for skill in "$staging/destination"/*; do
    name="$(basename "$skill")"
    rm -rf "$destination/$name"
    mv "$skill" "$destination/$name"
done
for ((i=0; i<${#metadata[@]}; i++)); do
    cat "$staging/metadata/$i" > "${metadata[$i]}"
done
