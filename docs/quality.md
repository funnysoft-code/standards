# Quality gates

Named gates, how to run them, and product-code include lists. Policy (zero-violation, two nets, definition of done): [engineering.md](engineering.md).

Lefthook is an earlier copy of CI. Playwright TS is merge-time. Everything else that can run locally runs in Lefthook.

## Named gates

### PHP (`scripts/php-gate.sh`)

| Gate | Command / bar |
| --- | --- |
| `pint` | Pint, Laravel preset. `--parallel --test`. |
| `phpstan` | PHPStan max. Larastan. Pest PHPStan plugin. No bleedingEdge. No new baseline. |
| `rector` | Clean on the agreed set (Laravel current + Pest coding style + PHP current). |
| `pest` | Pest 5 via `vendor/bin/pest`, not `artisan test` (providers load before PCOV). 100% line coverage of named product code. Not branch coverage. Coverage is not a reason to test private methods. 100% Pest type-coverage. Architecture tests lock the layer shape. |
| `all` | pint, phpstan, rector, pest in that order. |

API+Next products may keep `scripts/api-gate.sh` as the PHP entry.

Test-first is encouraged, not required. Do not add TIA, sharding, or the Pest agent plugin until the suite is slow.

### JS/TS (`scripts/frontend-gate.sh`)

| Gate | Vite / Inertia | Next |
| --- | --- | --- |
| `lint` | `vp lint` / `vp fmt` (vite-plus) | `oxlint --deny-warnings` / oxfmt |
| `typecheck` | `tsc --noEmit` | `tsc --noEmit` |
| `test` | Vitest 100% line coverage of authored `lib/` | Vitest 100% line coverage of authored `lib/` (and workspace packages when they exist) |
| `doctor` | React Doctor: zero warnings. Fix. Do not disable. | React Doctor: zero warnings. Fix. Do not disable. |
| `e2e` | Playwright TS (merge-time) | Playwright TS (merge-time) |
| `schema` | n/a | API+Next: generated client matches OpenAPI |
| `workflows` | n/a | API+Next: `tests/workflows.yml` registry |

oxc family. No ESLint/Prettier.

Not page shells. A component with real logic moves into `lib/` first.

### E2E

| Variant | E2E |
| --- | --- |
| Inertia monolith | Playwright TS. Pest Browser is retired. |
| API+Next | Playwright TS + `tests/workflows.yml` registry. Maestro when a customer mobile app exists. |
| Next-only | Playwright TS when the product has user journeys to lock. |

Stubbed Playwright on CI. Live against Herd on the laptop. Lefthook skips Playwright.

## Shared scripts

`scripts/` not `bin/`. Stamp copies the shared names. Product-only scripts (sidecars, worktrees) stay in `scripts/` and are not overwritten by stamp.

| Script | Job |
| --- | --- |
| `stamp.sh` | In this repo. Copy templates into a product at a pin. |
| `lint-commit-msg.sh` | Conventional Commits allowlist. |
| `php-gate.sh` | `pint\|phpstan\|rector\|pest\|all` (Inertia monolith). API variant may keep `api-gate.sh`. |
| `frontend-gate.sh` | `lint\|typecheck\|test\|e2e\|doctor` (plus `schema\|workflows` on API+Next). |
| `screenshot.sh` | 1440x900 default, 390x844 phone. |
| `ci-changes.sh` | Optional path-area detection when the repo has areas. |

## Out of the percentage

Every variant excludes: vendor, generated types, mocks, DESIGN.md, tokens as fixtures, config, providers, makers, route files, migrations, factories, page/route files.

## Include lists

### Inertia monolith

PHP product code (100% Pest line coverage and 100% type-coverage):

- `app/Actions`
- `app/Http` (Controllers, Requests, product Middleware)
- `app/Data`
- `app/Repositories`
- `app/Models`
- `app/Policies`
- `app/Services` (HTTP/Playwright adapters)
- product Jobs, Events, Listeners, Notifications, Enums when they exist

JS: `resources/js/lib` at 100% Vitest line coverage. Not `resources/js/pages`.

Tests live in `tests/Http/{Noun}`, `tests/Unit` for pure mappers, `tests/Architecture`. Playwright in `e2e/`.

### API+Next

PHP product code (100% Pest line coverage and 100% type-coverage):

- nwidart module Actions, HTTP, Data, Repositories, Support, Policies, Models, Enums, Notifications, Import, and product Console commands
- shared `app/Http`, `app/Actions`, `app/Support`, `app/Exceptions` when those trees hold product code

JS: each app `lib/` and each workspace package's authored TypeScript at 100% Vitest line coverage. Not page/route files.

Every named job in `tests/workflows.yml` has a Playwright tag. Customer jobs also have a Maestro file when a store app exists. Generated client `schema.d.ts` matches `openapi.json`.

### Next-only

No PHP gates.

JS: authored `lib/` (and workspace packages when they exist) at 100% Vitest line coverage. `oxlint --deny-warnings`, oxfmt, `tsc --noEmit`. React Doctor zero warnings when the app uses React.

Design loop still applies ([design.md](design.md)).
