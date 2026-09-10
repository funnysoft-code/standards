# Variant: API+Next

One repository with Laravel in `services/api`, Next in `apps/web`, the generated client in `packages/api-client`, and design tokens/mocks in `packages/design-system`. The export variant is `api-next`.

nwidart domain modules. Integer PK + `uuid` column. Not `HasUuids`. UUID v7 on new UUID columns. JsonResource. OpenAPI via Scramble Pro. Shared generated client. snake_case JSON. No typescript-transformer as the HTTP schema.

Playbook defaults in [engineering.md](../engineering.md). Gates and include lists in [quality.md](../quality.md).

## HTTP contract

snake_case JSON. Public identifiers are UUIDs on the `uuid` column. Integer ids never appear in HTTP. Primary keys stay integers.

Write path: FormRequest (authorize + validate) → Data → Action::execute → repository persist → JsonResource.

Read path: FormRequest validates query keys against repository allowlists. Controller calls `list()` / `show()` on the repository. No pass-through List/Show Actions.

## Backend layout

nwidart domain modules own Actions, HTTP, Data, Repositories, Models, migrations for that module.

Boost lives in `services/api`, with `services/api/artisan` and app-local generated
skills in `services/api/.agents/skills`. Sync copies these and Cloud skills to
real repository-root `.agents/skills` files, then refreshes native provider adapters. Composer runs from `services/api`.
Its local guidelines package is `services/api/packages/boost-guidelines`.

Action classes still use the `*Action` suffix. No BaseAction. No repository interfaces.

## Frontend

Next on Vercel. Expo on the store path when a customer mobile app exists.

Design SSOT: `packages/design-system` ([design.md](../design.md)).

Playwright TS + `tests/workflows.yml` registry. Maestro when a customer mobile app exists. Vitest 100% on each app `lib/` and workspace packages.

## Queues and laptop

Horizon is the playbook queue runner. Redis protocol for cache, sessions, locks, rate limits, and Horizon queues.

Product queue deviations require a product ADR; they are not inherited by the starter.

Laptop API is Herd. No Sail. No Cursor Cloud.

## Account baseline

Apply the shared [account policy](../engineering.md#shared-laravel-account-policy). Laravel owns settings, registration availability, sessions, verification, password/passkey confirmation, and optional authenticator 2FA. Public capabilities come from Laravel; Next does not maintain its own registration switch. API verification and passkey resources use public UUIDs and safe JsonResource responses. Generated accounts are individual users, with no product domain module required to sign in.

## Deployment targets

API: Laravel Cloud compute, Postgres, and Valkey in EU Central (Frankfurt). Next: Vercel.
