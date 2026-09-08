#!/usr/bin/env bash
# Fresh Laravel schema -> fresh TypeScript. Check mode never rewrites artifacts.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
mode="${1:---check}"
case "$mode" in --check|--write) ;; *) echo "usage: $0 --check|--write" >&2; exit 2 ;; esac
[[ -f "$root/services/api/vendor/autoload.php" ]] || { echo 'schema: install API Composer dependencies first' >&2; exit 1; }
compiler="$root/node_modules/.bin/openapi-typescript"
[[ -x "$compiler" ]] || compiler="$root/packages/api-client/node_modules/.bin/openapi-typescript"
[[ -x "$compiler" ]] || { echo 'schema: openapi-typescript missing; install locked JS dependencies' >&2; exit 1; }
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
(cd "$root/services/api"; php artisan scramble:export --path="$tmp/openapi.json")
"$compiler" "$tmp/openapi.json" -o "$tmp/schema.d.ts"
schema="$root/packages/api-client/openapi.json"
types="$root/packages/api-client/src/schema.d.ts"
if [[ "$mode" == --write ]]; then
    mkdir -p "$(dirname "$types")"
    cp "$tmp/openapi.json" "$schema"
    cp "$tmp/schema.d.ts" "$types"
else
    cmp -s "$tmp/openapi.json" "$schema" || { echo 'schema: OpenAPI is stale; run scripts/generate-api-client.sh --write' >&2; exit 1; }
    cmp -s "$tmp/schema.d.ts" "$types" || { echo 'schema: TypeScript client is stale; run scripts/generate-api-client.sh --write' >&2; exit 1; }
fi
