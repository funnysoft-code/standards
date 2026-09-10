#!/usr/bin/env bash
# Materialize and format Boost artifacts before replacing any original files.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
php_root="$root/__PHP_ROOT__"
php_root="${php_root%/.}"
source="$php_root/.ai/skills"
generated="$root/__BOOST_SKILLS__"
destination="$root/.agents/skills"
receipt="$root/.agents/boost-sync-receipt.json"
real_parents() {
    local cursor="$1"
    while [[ "$cursor" != "$root" ]]; do
        [[ ! -L "$cursor" ]] || { echo "boost-sync: symlink root or parent: $cursor" >&2; return 1; }
        cursor="$(dirname "$cursor")"
    done
}
for path_entry in "$generated" "$source" "$destination" "$receipt" \
    "$root/AGENTS.md" "$root/boost.json" "$php_root/AGENTS.md" "$php_root/boost.json"; do
    real_parents "$path_entry"
done
shopt -s nullglob
formatter=()
if [[ -x "$root/node_modules/.bin/vp" ]]; then formatter=("$root/node_modules/.bin/vp" fmt)
elif [[ -x "$root/node_modules/.bin/oxfmt" ]]; then formatter=("$root/node_modules/.bin/oxfmt")
else echo 'boost-sync: formatter missing; install locked JS dev dependencies (vp or oxfmt)' >&2; exit 1
fi

# Validate links and file types without opening file contents. This must happen
# before staging is created or any formatter can touch materialized content.
# Links may point elsewhere in the repository, but never outside its canonical
# root. Tracking canonical directory ancestors also rejects recursive links.
node - "$root" "$generated" "$source" "$destination" "$receipt" \
    "$root/AGENTS.md" "$root/boost.json" "$php_root/AGENTS.md" "$php_root/boost.json" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const repository = fs.realpathSync(process.argv[2]);
const insideRepository = (target) => target === repository || target.startsWith(repository + path.sep);
function walk(entry, ancestors = new Set()) {
  let stat;
  try { stat = fs.lstatSync(entry); }
  catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  if (stat.isSymbolicLink()) {
    let target;
    try { target = fs.realpathSync(entry); }
    catch { throw new Error(`boost-sync: dangling or cyclic symlink: ${entry}`); }
    if (!insideRepository(target)) throw new Error(`boost-sync: symlink target escapes repository root: ${entry}`);
    return walk(target, ancestors);
  }
  if (stat.isFile()) return;
  if (!stat.isDirectory()) throw new Error(`boost-sync: special file is not allowed: ${entry}`);
  const canonical = fs.realpathSync(entry);
  if (ancestors.has(canonical)) throw new Error(`boost-sync: cyclic directory symlink: ${entry}`);
  const nestedAncestors = new Set(ancestors).add(canonical);
  for (const name of fs.readdirSync(entry)) walk(path.join(entry, name), nestedAncestors);
}
for (const entry of process.argv.slice(3)) walk(entry);
NODE
staging="$(mktemp -d "$root/.boost-sync.XXXXXX")"
receipt_temp=''
cleanup() {
    rm -rf "$staging"
    [[ -z "$receipt_temp" ]] || rm -f "$receipt_temp"
}
trap cleanup EXIT
mkdir "$staging/sources" "$staging/selected" "$staging/selected-origin" "$staging/current" \
    "$staging/owned" "$staging/new-owned" "$staging/metadata" "$staging/configured" "$staging/root-preserved"
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
skill_name() {
    [[ "$1" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]] || { echo "boost-sync: invalid skill name: $1" >&2; return 1; }
}
tree_hash() {
    node - "$1" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = process.argv[2];
const hash = createHash('sha256');
function walk(directory, prefix = '') {
  for (const name of fs.readdirSync(directory).sort()) {
    const absolute = path.join(directory, name);
    const relative = prefix ? `${prefix}/${name}` : name;
    const stat = fs.lstatSync(absolute);
    if (stat.isDirectory()) walk(absolute, relative);
    else if (stat.isFile()) {
      hash.update(relative); hash.update('\0'); hash.update(fs.readFileSync(absolute)); hash.update('\0');
    } else throw new Error(`unsupported entry in managed skill: ${relative}`);
  }
}
walk(root);
process.stdout.write(hash.digest('hex'));
NODE
}
same_directory() {
    local left right
    left="$(cd "$1" 2>/dev/null && pwd -P)" || return 1
    right="$(cd "$2" 2>/dev/null && pwd -P)" || return 1
    [[ "$left" == "$right" ]]
}
sources=()
stage_source() {
    local src="${1%/}" name index
    name="$(basename "$src")"
    skill_name "$name"
    [[ -d "$src" && -f "$src/SKILL.md" ]] || { echo "boost-sync: SKILL.md missing in $src" >&2; return 1; }
    sources+=("$src")
    index=$((${#sources[@]} - 1))
    cp -RL "$src" "$staging/sources/$index"
    format_tree "$staging/sources/$index" "$src"
    rm -rf "$staging/selected/$name"
    cp -R "$staging/sources/$index" "$staging/selected/$name"
    printf '%s' "$src" > "$staging/selected-origin/$name"
}

# In a monolith, Boost can generate a regular tree directly at the destination.
# Its explicit skill list lets us format and dereference those trees without
# claiming every manually authored process skill in the shared directory.
if [[ "$generated" == "$destination" && -f "$php_root/boost.json" ]]; then
    node - "$php_root/boost.json" "$staging/configured" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const config = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (config.skills !== undefined && (!Array.isArray(config.skills) || config.skills.some((name) => typeof name !== 'string'))) {
  throw new Error('boost-sync: invalid skills in boost.json');
}
for (const name of config.skills ?? []) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)) throw new Error('boost-sync: invalid skills in boost.json');
  fs.writeFileSync(path.join(process.argv[3], name), '');
}
NODE
    for marker in "$staging/configured"/*; do
        name="$(basename "$marker")"
        skill="$destination/$name"
        [[ -e "$skill" || -L "$skill" ]] || continue
        [[ -d "$skill" && -f "$skill/SKILL.md" ]] || { echo "boost-sync: SKILL.md missing in $skill" >&2; exit 1; }
        [[ -L "$skill" ]] && continue
        cp -RL "$skill" "$staging/root-preserved/$name"
        format_tree "$staging/root-preserved/$name" "$skill"
    done
fi

# A separate generated tree is an input. When Boost generates directly into the
# root destination, only its links are inputs. Regular root skills are authored
# policy and must not become owned merely because they share that directory.
if [[ "$generated" != "$destination" ]]; then
    for src in "$generated"/*; do stage_source "$src"; done
else
    for src in "$generated"/*; do [[ ! -L "$src" ]] || stage_source "$src"; done
fi
# App-local Boost materializations have final precedence over generated inputs.
for src in "$source"/*; do stage_source "$src"; done

destination_count=0
for skill in "$destination"/*; do
    name="$(basename "$skill")"
    skill_name "$name"
    [[ -d "$skill" && -f "$skill/SKILL.md" ]] || { echo "boost-sync: SKILL.md missing in $skill" >&2; exit 1; }
    destination_count=$((destination_count + 1))
done
[[ ${#sources[@]} -gt 0 || $destination_count -gt 0 ]] || {
    echo 'boost-sync: generated skill set is empty; run boost:update first' >&2
    exit 1
}

metadata=()
for directory in "$root" "$php_root"; do
    for file in "$directory/AGENTS.md" "$directory/boost.json"; do
        real_parents "$file"
        [[ ! -f "$file" ]] || metadata+=("$file")
    done
    [[ "$root" != "$php_root" ]] || break
done
for ((i=0; i<${#metadata[@]}; i++)); do
    cp "${metadata[$i]}" "$staging/metadata/$i"
    format_file "$staging/metadata/$i" "${metadata[$i]}"
done

# Parse ownership before any replacement. The receipt records only hashes, and
# marker filenames are constrained to the same safe vocabulary as skill names.
node - "$receipt" "$staging/owned" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const receipt = process.argv[2];
const output = process.argv[3];
if (!fs.existsSync(receipt)) process.exit(0);
let parsed;
try { parsed = JSON.parse(fs.readFileSync(receipt, 'utf8')); }
catch { throw new Error('boost-sync: invalid ownership receipt'); }
if (parsed?.schemaVersion !== 1 || !parsed.skills || Array.isArray(parsed.skills) || typeof parsed.skills !== 'object') {
  throw new Error('boost-sync: invalid ownership receipt');
}
for (const [name, hash] of Object.entries(parsed.skills)) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name) || !/^[a-f0-9]{64}$/.test(hash)) {
    throw new Error('boost-sync: invalid ownership receipt');
  }
  fs.writeFileSync(path.join(output, name), hash);
}
NODE

# Finalize desired destination bytes and hashes before checking whether an
# interrupted prior publication already installed those exact bytes.
for skill in "$staging/selected"/*; do
    name="$(basename "$skill")"
    format_tree "$skill" "$destination/$name"
    tree_hash "$skill" > "$staging/new-owned/$name"
done

# An owned destination may be replaced or deleted only while it still matches
# the last materialized hash. It may also match the exact staged desired hash,
# which recovers a destination published before an interrupted receipt update.
# A fresh Boost link to the selected source is safe because Boost itself has
# explicitly replaced that destination.
for marker in "$staging/owned"/*; do
    name="$(basename "$marker")"
    current="$destination/$name"
    [[ -e "$current" || -L "$current" ]] || continue
    if [[ -L "$current" && -f "$staging/selected-origin/$name" ]] && \
        same_directory "$current" "$(cat "$staging/selected-origin/$name")"; then
        continue
    fi
    rm -rf "$staging/current/$name"
    cp -RL "$current" "$staging/current/$name"
    actual="$(tree_hash "$staging/current/$name")"
    expected="$(cat "$marker")"
    desired=''
    [[ ! -f "$staging/new-owned/$name" ]] || desired="$(cat "$staging/new-owned/$name")"
    [[ "$actual" == "$expected" || ( -n "$desired" && "$actual" == "$desired" ) ]] || {
        echo "boost-sync: edited managed destination refuses replacement: $current" >&2
        exit 1
    }
done

# Unowned root skills are canonical or custom. Never overwrite them unless
# Boost has replaced the entry with a link to the exact selected source.
for skill in "$staging/selected"/*; do
    name="$(basename "$skill")"
    current="$destination/$name"
    if [[ ( -e "$current" || -L "$current" ) && ! -f "$staging/owned/$name" ]]; then
        if [[ ! -L "$current" ]] || ! same_directory "$current" "$(cat "$staging/selected-origin/$name")"; then
            echo "boost-sync: unowned destination collision refuses replacement: $current" >&2
            exit 1
        fi
    fi
done

node - "$staging/new-owned" "$staging/receipt" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const input = process.argv[2];
const output = process.argv[3];
const skills = {};
for (const name of fs.readdirSync(input).sort()) skills[name] = fs.readFileSync(path.join(input, name), 'utf8');
fs.writeFileSync(output, JSON.stringify({ schemaVersion: 1, skills }, null, 2) + '\n');
NODE
format_file "$staging/receipt" "$receipt"

# Every input, metadata file, and desired destination was validated and
# formatted successfully. Replacements and owned deletions can now begin.
for ((i=0; i<${#sources[@]}; i++)); do
    src="${sources[$i]}"
    [[ "$(dirname "$src")" != "$destination" ]] || continue
    rm -rf "$src"
    mv "$staging/sources/$i" "$src"
done
for marker in "$staging/owned"/*; do
    name="$(basename "$marker")"
    [[ -d "$staging/selected/$name" ]] || rm -rf "$destination/$name"
done
for skill in "$staging/root-preserved"/*; do
    name="$(basename "$skill")"
    [[ -f "$staging/owned/$name" || -d "$staging/selected/$name" ]] && continue
    rm -rf "$destination/$name"
    mv "$skill" "$destination/$name"
done
mkdir -p "$destination"
for skill in "$staging/selected"/*; do
    name="$(basename "$skill")"
    rm -rf "$destination/$name"
    mv "$skill" "$destination/$name"
done
for ((i=0; i<${#metadata[@]}; i++)); do
    cat "$staging/metadata/$i" > "${metadata[$i]}"
done
mkdir -p "$(dirname "$receipt")"
receipt_temp="$(mktemp "$(dirname "$receipt")/.boost-sync-receipt.XXXXXX")"
cat "$staging/receipt" > "$receipt_temp"
mv -f "$receipt_temp" "$receipt"
receipt_temp=''
node "$root/scripts/provider-sync.mjs" --root "$root"
