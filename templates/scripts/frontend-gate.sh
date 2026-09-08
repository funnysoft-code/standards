#!/usr/bin/env bash
# No network downloads or optional-tool skips in quality gates.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
IFS=',' read -r -a js_roots <<< '__JS_ROOTS__'
api=false
inertia=false
variant="$(node -p 'require("./STANDARDS_MANIFEST.json").variant')"
case "$variant" in
    api-next) api=true ;;
    inertia-monolith) inertia=true ;;
    next-only) ;;
    *) echo 'frontend-gate: invalid standards variant receipt' >&2; exit 1 ;;
esac
tool() {
    local name="$1" executable
    shift
    executable="$PWD/node_modules/.bin/$name"
    [[ -x "$executable" ]] || executable="$root/node_modules/.bin/$name"
    [[ -x "$executable" ]] || { echo "frontend-gate: $name missing; install locked JS dev dependencies" >&2; return 1; }
    "$executable" "$@"
}
case "${1:-}" in
    lint)
        if $inertia; then tool vp lint; tool vp fmt --check
        else tool oxlint --deny-warnings; tool oxfmt --check; fi
        ;;
    typecheck)
        if $inertia; then
            [[ -f vendor/autoload.php ]] || { echo 'frontend-gate: install Composer dependencies before generating Inertia contracts' >&2; exit 1; }
            php artisan wayfinder:generate --with-form
            php artisan typescript:transform
        fi
        for app in "${js_roots[@]}"; do (cd "$root/$app"; tool tsc --noEmit); done
        ;;
    test)
        includes=()
        if $inertia; then includes+=(--coverage.include='resources/js/lib/**/*.{ts,tsx}')
        else
            for app in "${js_roots[@]}"; do
                if [[ "$app" == packages/* ]]; then includes+=("--coverage.include=$app/**/*.{ts,tsx}")
                elif [[ "$app" == . ]]; then includes+=(--coverage.include='lib/**/*.{ts,tsx}' --coverage.include='src/lib/**/*.{ts,tsx}')
                else includes+=("--coverage.include=$app/lib/**/*.{ts,tsx}" "--coverage.include=$app/src/lib/**/*.{ts,tsx}"); fi
            done
        fi
        if [[ "${js_roots[0]}" == . ]]; then includes+=(--coverage.include='packages/*/**/*.{ts,tsx}'); fi
        tool vitest run --coverage --coverage.thresholds.lines=100 "${includes[@]}" --coverage.exclude='**/*.d.ts' --coverage.exclude='**/*.{test,spec}.{ts,tsx}' --coverage.exclude='**/generated/**' --coverage.exclude='**/mocks/**' --coverage.exclude='**/node_modules/**' --coverage.exclude='**/*.config.{ts,js}' --coverage.exclude='**/tokens/**' --coverage.exclude='**/fixtures/**'
        ;;
    doctor)
        (cd "$root/${js_roots[0]}"; tool react-doctor . --scope full --no-telemetry --blocking warning -y)
        ;;
    schema)
        $api || { echo 'frontend-gate: schema is only applicable to API+Next' >&2; exit 2; }
        bash "$root/scripts/generate-api-client.sh" --check
        ;;
    workflows)
        $api || { echo 'frontend-gate: workflows is only applicable to API+Next' >&2; exit 2; }
        command -v bun >/dev/null || { echo 'frontend-gate: Bun is required' >&2; exit 1; }
        bun "$root/scripts/check-workflows.mjs"
        ;;
    e2e) tool playwright test ;;
    *) echo "usage: $0 lint|typecheck|test|doctor|schema|workflows|e2e" >&2; exit 2 ;;
esac
