#!/usr/bin/env bash
# PHP gates from the product root. Usage: scripts/php-gate.sh <pint|phpstan|rector|pest|all>
# Skip when vendor is missing (laptop without Composer). CI must install first.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
gate="${1:-}"

if [[ -z "$gate" ]]; then
    echo "usage: $0 <pint|phpstan|rector|pest|all>" >&2
    exit 2
fi

if [[ ! -x "$root/vendor/bin/pint" ]]; then
    if [[ -n "${GITHUB_ACTIONS:-}" ]]; then
        echo "php-gate: vendor/bin/pint missing or not executable" >&2
        exit 1
    fi
    echo "php-gate: skip (vendor not installed)"
    exit 0
fi

cd "$root"

run_pint() {
    ./vendor/bin/pint --parallel --test --ansi
}

run_phpstan() {
    ./vendor/bin/phpstan analyse --memory-limit=2G --ansi
}

run_rector() {
    ./vendor/bin/rector --dry-run --ansi
}

run_pest() {
    # artisan test boots Laravel before PCOV starts. vendor/bin/pest starts coverage first.
    php -d pcov.directory="$PWD" -d pcov.initial.files=4096 vendor/bin/pest --compact --coverage --min=100
}

case "$gate" in
    pint) run_pint ;;
    phpstan) run_phpstan ;;
    rector) run_rector ;;
    pest) run_pest ;;
    all)
        run_pint
        run_phpstan
        run_rector
        run_pest
        ;;
    *)
        echo "usage: $0 <pint|phpstan|rector|pest|all>" >&2
        exit 2
        ;;
esac
