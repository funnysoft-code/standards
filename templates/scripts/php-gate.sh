#!/usr/bin/env bash
# Run from any directory. Composer tools always run in the owning application.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
gate="${1:-}"
case "$gate" in pint|phpstan|rector|pest|all) ;; *) echo "usage: $0 pint|phpstan|rector|pest|all" >&2; exit 2 ;; esac
cd "$root/__PHP_ROOT__"
[[ -f vendor/autoload.php ]] || { echo 'php-gate: install Composer dependencies first' >&2; exit 1; }
require_tool() {
    [[ -x "vendor/bin/$1" ]] || { echo "php-gate: vendor/bin/$1 missing; install Composer dev dependencies" >&2; exit 1; }
}
run_pint() { require_tool pint; vendor/bin/pint --parallel --test --ansi; }
run_phpstan() { require_tool phpstan; vendor/bin/phpstan analyse --level=max --memory-limit=2G --ansi; }
run_rector() { require_tool rector; vendor/bin/rector --dry-run --ansi; }
run_pest() (
    require_tool pest
    command -v php >/dev/null || { echo 'php-gate: PHP is required' >&2; exit 1; }
    config="$(mktemp "$PWD/.phpunit-quality.XXXXXX")"
    trap 'rm -f "$config"' EXIT
    php "$root/scripts/php-coverage-config.php" "$config" '__PHP_ROOT__'
    # Both reports read exactly the same named product-code source list.
    php -d zend.assertions=1 -d pcov.directory="$PWD" -d pcov.initial.files=4096 vendor/bin/pest --configuration="$config" --compact --coverage --min=100
    php vendor/bin/pest --configuration="$config" --type-coverage --min=100 --compact
)
case "$gate" in
    pint) run_pint ;; phpstan) run_phpstan ;; rector) run_rector ;; pest) run_pest ;;
    all) run_pint; run_phpstan; run_rector; run_pest ;;
esac
