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
| `schema` | n/a | API+Next: fresh Laravel OpenAPI and fresh generated client match both committed artifacts |
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

## Generated tooling contract

Gates resolve paths from their own script location, so the caller's working
directory does not matter. PHP commands run at the declared PHP root. Missing
Composer or JS dev tools fail locally and on CI. Gates use installed binaries;
they never download tools with `bunx`. The application templates own pinned
dependencies, configs, tests, and their lockfiles.

The PHP gate derives a temporary PHPUnit config in the PHP root, preserving
the application's bootstrap, suites, and environment while replacing `source`
with the existing directories in the include list below. Both Pest reports use
that config. The temporary file is removed on success or failure. PHP requires
the DOM extension; Pest requires PCOV and the type-coverage plugin.

Frontend lint checks formatting too. Typecheck runs in every declared JS root.
Inertia first runs `wayfinder:generate --with-form` and `typescript:transform`.
Vitest receives explicit authored-code includes and a 100% line threshold.
React Doctor scans the full React app with `--blocking warning`, including a
standalone Next root. Install React Doctor 0.9.12 or a verified compatible pin.

API+Next uses `scripts/generate-api-client.sh --check` to export fresh Laravel
OpenAPI into a temporary directory, generate types from that schema, and compare
both outputs with `packages/api-client/openapi.json` and
`packages/api-client/src/schema.d.ts`. It never rewrites committed files in check
mode. `--write` updates both after successful generation. Scramble Pro remains
mandatory. The command requires its existing Composer credential setup on CI.

`tests/workflows.yml` uses this shape. Every tag must appear in an `e2e/` test;
duplicate ids/tags, empty registries, and missing tags fail the `workflows` gate.
The registry parser uses Bun's built-in YAML parser and does not run Playwright
in Lefthook.

```yaml
workflows:
  - id: account-login
    tag: "@account-login"
```

Laravel CI runs Playwright with `E2E_MODE=stub`. Application-owned Playwright
configuration must start the app and stub external integrations in this mode.
The workflow provides ephemeral PostgreSQL and Redis, builds the app, and
installs Chromium. These CI service ports are not the local Herd defaults.
Next-only runs browser CI when a `playwright.config.*` file declares journeys.
An installed-tool or test failure is never converted into a pass.

### Manual deployment connections

The stamped deployment workflows are manual and run reusable quality checks
before deployment. Create hosting projects, services, deployment hooks, and
production environment variables yourself. No workflow provisions resources.
After connection, configure the matching repository variable and secret:

| Target | Enable variable | Deployment hook secret |
| --- | --- | --- |
| Laravel Cloud | `DEPLOY_CLOUD_ENABLED=true` | `LARAVEL_CLOUD_DEPLOY_HOOK_URL` |
| Vercel | `DEPLOY_VERCEL_ENABLED=true` | `VERCEL_DEPLOY_HOOK_URL` |

Inertia receives the Cloud workflow, Next-only receives Vercel, and API+Next
receives both. Keep provider auto-deploy disabled if it would bypass these
quality checks. Hooks target `main`; unconfigured targets do not deploy.
The hook request only queues a provider deployment. Its success is not proof
that the provider build, migration, or rollout succeeded. Inspect that result
through the provider CLI before reporting a completed deployment.

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
