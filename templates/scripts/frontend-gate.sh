#!/usr/bin/env bash
# Frontend gates. Usage: scripts/frontend-gate.sh <lint|typecheck|test|doctor>
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

gate="${1:-}"

has_vp() {
    [[ -f package.json ]] && grep -Eq '"vite-plus"|"test:lint"' package.json
}

has_vitest() {
    [[ -x node_modules/.bin/vitest ]] && return 0
    [[ -f package.json ]] && grep -q '"vitest"' package.json
}

run_doctor() {
    if [[ -d resources/js ]]; then
        bunx --bun react-doctor@0.9.12 resources/js --no-telemetry -y
        return
    fi
    if [[ -d apps ]]; then
        local found=0 app
        for app in apps/*; do
            [[ -d "$app" ]] || continue
            bunx --bun react-doctor@0.9.12 "$app" --no-telemetry -y
            found=1
        done
        [[ "$found" -eq 1 ]] && return
    fi
    echo "frontend-gate: skip doctor (no resources/js or apps)"
}

case "$gate" in
    lint)
        if has_vp; then
            bun run test:lint
        else
            bunx oxlint --deny-warnings
        fi
        ;;
    typecheck)
        bun run test:types
        ;;
    test)
        if has_vitest; then
            bunx vitest run --coverage
        else
            echo "frontend-gate: skip test (vitest not present)"
        fi
        ;;
    doctor)
        run_doctor
        ;;
    *)
        echo "usage: $0 lint|typecheck|test|doctor" >&2
        exit 2
        ;;
esac
