# Variant: Inertia monolith

Laravel + Inertia + React 19 + Tailwind 4 + shadcn. Wayfinder. Spatie typescript-transformer. bun. vite-plus. Boost at repo root (`__BOOST_ARTISAN__` = `artisan`). Horizon. UUID primary keys allowed (`HasUuids`).

Playbook defaults in [engineering.md](../engineering.md). Gates and include lists in [quality.md](../quality.md).

## HTTP contract

camelCase Data / Inertia props. DB columns snake_case. One HTTP contract per app. Do not mix snake_case JSON and camelCase props in one app.

Public identifiers are UUIDs. Integer ids never appear in HTTP. UUID primary keys are allowed (`HasUuids`). New UUID columns use UUID v7 (`Str::uuid7()`).

## Write path

FormRequest (authorize + validate) → Data → Action::execute → repository persist → Inertia render or `to_route()`.

## Read path

FormRequest validates query keys against repository allowlists. Controller calls `list()` / `show()` on the repository. No pass-through List/Show Actions. No Data object on list/show.

## Controllers

Stay thin. `final`. Method-inject Actions and repositories. `#[CurrentUser]`.

## Services

Supplier HTTP/Playwright clients live in `app/Services/{Name}` as adapters. They are not nouns.

## Noun folders

Noun folders across Http, Actions, Data, Repositories, Models, tests:

```
app/Http/Controllers/SearchRuns/
app/Http/Requests/SearchRuns/
app/Actions/SearchRuns/
app/Data/SearchRuns/
app/Repositories/SearchRuns/
app/Models/SearchRuns/
tests/Http/SearchRuns/IndexTest.php
```

Tests: `tests/Http/{Noun}`, `tests/Unit` for pure mappers, `tests/Architecture`. Playwright TS in `e2e/`.

## Frontend

`resources/js/pages` kebab-case. Do not edit Wayfinder output or `generated.d.ts` by hand.

`resources/js/lib` Vitest 100% line coverage. Not page shells. A component with real logic moves into `lib/` first.

Playwright TS. Pest Browser is retired.

Passkeys stay when a login UI exists.

`per_page` default is product.

Design SSOT: `__DESIGN_ROOT__` = `design` ([design.md](../design.md)).

## Laptop and deploy

Laptop start stays Herd. No Sail. Horizon is the queue runner. Redis for session, cache, locks, rate limits, and Horizon queues.

Laravel Cloud compute, Postgres, and Valkey in EU Central (Frankfurt). Quality on PRs. Push to main: quality then Cloud deploy.
