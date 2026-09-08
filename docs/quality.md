# Quality gates

Named gates, how to run them, and product-code include lists. Policy (zero-violation, two nets, definition of done): [engineering.md](engineering.md).

Lefthook is an earlier copy of CI. Playwright TS is merge-time. Everything else that can run locally runs in Lefthook.

## Named gates

### PHP (`scripts/php-gate.sh`)

| Gate      | Command / bar                                                                                                                                                                                                                                                     |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pint`    | Pint, Laravel preset. `--parallel --test`.                                                                                                                                                                                                                        |
| `phpstan` | PHPStan max. Larastan. Pest PHPStan plugin. No bleedingEdge. No new baseline.                                                                                                                                                                                     |
| `rector`  | Clean on the agreed set (Laravel current + Pest coding style + PHP current).                                                                                                                                                                                      |
| `pest`    | Pest 5 via `vendor/bin/pest`, not `artisan test` (providers load before PCOV). 100% line coverage of named product code. Not branch coverage. Coverage is not a reason to test private methods. 100% Pest type-coverage. Architecture tests lock the layer shape. |
| `all`     | pint, phpstan, rector, pest in that order.                                                                                                                                                                                                                        |

API+Next products may keep `scripts/api-gate.sh` as the PHP entry.

Test-first is encouraged, not required. Do not add TIA, sharding, or the Pest agent plugin until the suite is slow.

### JS/TS (`scripts/frontend-gate.sh`)

| Gate        | Vite / Inertia                                    | Next                                                                                      |
| ----------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `lint`      | `vp lint` / `vp fmt` (vite-plus)                  | `oxlint --deny-warnings` / oxfmt                                                          |
| `typecheck` | `tsc --noEmit`                                    | `tsc --noEmit`                                                                            |
| `test`      | Vitest 100% line coverage of authored `lib/`      | Vitest 100% line coverage of authored `lib/` (and workspace packages when they exist)     |
| `doctor`    | React Doctor: zero warnings. Fix. Do not disable. | React Doctor: zero warnings. Fix. Do not disable.                                         |
| `e2e`       | Playwright TS (merge-time)                        | Playwright TS (merge-time)                                                                |
| `schema`    | n/a                                               | API+Next: fresh Laravel OpenAPI and fresh generated client match both committed artifacts |
| `workflows` | n/a                                               | API+Next: `tests/workflows.yml` registry                                                  |

oxc family. No ESLint/Prettier.

Not page shells. A component with real logic moves into `lib/` first.

### E2E

| Variant          | E2E                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------ |
| Inertia monolith | Playwright TS. Pest Browser is retired.                                                    |
| API+Next         | Playwright TS + `tests/workflows.yml` registry. Maestro when a customer mobile app exists. |
| Next-only        | Playwright TS when the product has user journeys to lock.                                  |

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
OpenAPI into a temporary directory, generate types from that schema, format both
fresh artifacts with installed oxfmt using their destination paths, and compare
both outputs with `packages/api-client/openapi.json` and
`packages/api-client/src/schema.d.ts`. It never rewrites committed files in check
mode. `--write` updates both after successful generation and formatting. Missing
oxfmt or a formatting error fails before either snapshot is written. Scramble Pro remains
mandatory. The command requires its existing Composer credential setup on CI.

`tests/workflows.yml` uses this shape. Every tag must belong to an active `e2e/` test;
duplicate ids/tags, empty registries, and missing tags fail the `workflows` gate.
The registry parser uses Bun's built-in YAML parser and the installed
`@playwright/test` CLI with `test --list --reporter=json`. Collection is
browser-free: it evaluates declarations and config, without running test bodies
or global setup. Literal title tags, inherited describe tags and tag metadata
count. Comments, unrelated strings, empty suites and statically skipped tests
do not. Conditional skips inside test bodies are checked only by browser CI.
Keep config and declaration-time code free of external service calls so this
local gate works offline. Collection errors fail the gate.

```yaml
workflows:
  - id: account-login
    tag: "@account-login"
```

Laravel CI runs Playwright with `E2E_MODE=stub`. Application-owned Playwright
configuration must start the app and stub external integrations in this mode.
The workflow provides ephemeral PostgreSQL and Redis, builds the app, and
installs Chromium. These CI service ports are not the local Herd defaults.
API+Next installs Chromium separately in both `test` and `e2e` matrix jobs,
because its Vitest integration suite also launches a browser. Only `e2e` builds
the application before the gate.
Next-only runs browser CI when a `playwright.config.*` file declares journeys.
That job copies the committed, nonsecret root `.env.example` to `.env` before
building. Keep required local build values such as `NEXT_PUBLIC_SITE_URL` in
the example; CI must work without generation-time ignored files.
An installed-tool or test failure is never converted into a pass.

### Manual deployment connections

The stamped deployment workflows are manual and run reusable quality checks
before deployment. Create hosting projects, services, and
production environment variables yourself. No workflow provisions resources.
Inertia receives the Cloud workflow, Next-only receives Vercel, and API+Next
receives both. Keep provider auto-deploy disabled if it would bypass these
quality checks. Dispatch is restricted to `main`. Quality and deployment refer
to the dispatch's immutable `github.sha`, even when `main` advances during CI.
Unconfigured targets report that state without deploying.

For Vercel, configure repository variables `DEPLOY_VERCEL_ENABLED=true`,
`VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and an exact verified `VERCEL_CLI_VERSION`.
Store `VERCEL_TOKEN` as a secret. IDs must identify an existing project and team;
the workflow does not create or discover a project. Configure its root directory
and production environment manually, including `apps/web` for API+Next, with
build commands compatible with the repository's locked Bun dependencies.
The workflow checks out `github.sha`, verifies HEAD, installs the lockfile,
pulls production settings, and runs `vercel build --prod`. It deploys that local
output with `--prebuilt --prod --skip-domain`, records `githubCommitSha` metadata,
and promotes only the returned deployment URL. It never deploys a moving branch.
This binds source bytes to the quality revision; provider settings and production
environment values are separately managed configuration. Verify application health
after promotion before reporting a completed rollout.

For Cloud, connect the existing environment to this repository's `main` branch
and disable push-to-deploy in Settings > Deployments. Enable its deploy hook,
store the raw HTTPS URL as the secret `LARAVEL_CLOUD_DEPLOY_HOOK_URL`, and set
`DEPLOY_CLOUD_ENABLED=true`. Store the URL without query parameters or a fragment.
Configure build/deploy commands and production variables manually, including
the `services/api` application root for API+Next.

The [official Cloud deploy-hook contract](https://laravel.com/cloud/docs/deployments#deploy-hooks)
accepts a POST with `?commit_hash=<commit>` and says it pulls code from that
specified commit. Its GitHub Actions example passes `github.sha` directly.
The commit must belong to the environment's configured branch. Only omission
of the parameter is documented to select the latest branch commit. The workflow
requires a full 40-character hexadecimal `github.sha` before issuing this POST,
so advancing `main` does not change the requested revision. It never falls back
to a branch-only request or sends an undocumented `commit_sha` body.

Missing or malformed local configuration fails before any request. Transport
errors and non-2xx responses fail the job. The request has bounded timeouts,
does not follow redirects, and is not automatically retried. The secret URL and
provider response body are not printed. A 2xx response acknowledges the hook
request; it does not verify a completed build or rollout. Before retrying a
timed-out request, inspect Cloud because the deployment may already be queued.

The official docs do not specify the response or fallback behavior for an
unknown or off-branch hash. Keep the checked commit reachable on `main` and
verify the provider's recorded `commit_hash` and final deployment status before
reporting a release complete. Local validation cannot prove remote reachability.
The binding is supported by the documented contract and mocked execution tests;
a real-provider revision and rollout check remains part of release verification.

Provider contracts checked on 2026-09-08. Vercel references:
[prebuilt deployments](https://vercel.com/docs/cli/deploying-from-cli),
[build](https://vercel.com/docs/cli/build), and
[promote](https://vercel.com/docs/cli/promote).

## Shared scripts

`scripts/` not `bin/`. Stamp copies the shared names. Product-only scripts (sidecars, worktrees) stay in `scripts/` and are not overwritten by stamp.

| Script               | Job                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `stamp.sh`           | In this repo. Copy templates into a product at a pin.                                      |
| `lint-commit-msg.sh` | Conventional Commits allowlist.                                                            |
| `php-gate.sh`        | `pint\|phpstan\|rector\|pest\|all` (Inertia monolith). API variant may keep `api-gate.sh`. |
| `frontend-gate.sh`   | `lint\|typecheck\|test\|e2e\|doctor` (plus `schema\|workflows` on API+Next).               |
| `screenshot.sh`      | 1440x900 default, 390x844 phone.                                                           |
| `ci-changes.sh`      | Optional path-area detection when the repo has areas.                                      |

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
