# Variant: API+Next

Documented from Apex Scout v2. Not stamped in the F7T-127 pass.

nwidart domain modules. Integer PK + `uuid` column. Not `HasUuids`. UUID v7 on new UUID columns. JsonResource. OpenAPI via Scramble Pro. Shared generated client. snake_case JSON. No typescript-transformer as the HTTP schema.

Playbook defaults in [engineering.md](../engineering.md). Gates and include lists in [quality.md](../quality.md).

## HTTP contract

snake_case JSON. Public identifiers are UUIDs on the `uuid` column. Integer ids never appear in HTTP. Primary keys stay integers.

Write path: FormRequest (authorize + validate) → Data → Action::execute → repository persist → JsonResource.

Read path: FormRequest validates query keys against repository allowlists. Controller calls `list()` / `show()` on the repository. No pass-through List/Show Actions.

## Backend layout

nwidart domain modules own Actions, HTTP, Data, Repositories, Models, migrations for that module.

Boost lives in `services/api` (`__BOOST_ARTISAN__` = `services/api/artisan`).

Action classes still use the `*Action` suffix. No BaseAction. No repository interfaces.

## Frontend

Next on Vercel. Expo on the store path when a customer mobile app exists.

Design SSOT: `__DESIGN_ROOT__` = `packages/design-system` ([design.md](../design.md)).

Playwright TS + `tests/workflows.yml` registry. Maestro when a customer mobile app exists. Vitest 100% on each app `lib/` and workspace packages.

## Queues and laptop

Horizon is the playbook queue runner. Redis protocol for cache, sessions, locks, rate limits, and Horizon queues.

Laravel Cloud managed queues are an Apex product deviation against this playbook's Horizon default. When Apex adopts the playbook it ADRs that deviation or switches.

Laptop API is Herd. No Sail. No Cursor Cloud.

## Deploy

API: Laravel Cloud compute, Postgres, and Valkey in EU Central (Frankfurt). Next: Vercel.
