---
name: funnysoft-quality
description: Run FunnySoft Laravel quality gates and regenerate the owning stack's contracts.
---

# FunnySoft quality

Read the pinned `docs/playbook/quality.md` from the repository root. Run the
shared scripts from that root, even when Composer lives in `services/api`.

1. Run `scripts/php-gate.sh all`. Pest must pass both 100% line coverage and
   100% type coverage of the named product directories.
2. Run `scripts/frontend-gate.sh lint`, `typecheck`, `test`, and `doctor`.
   Install missing locked dev dependencies. Never treat a missing tool as a pass.
3. For API+Next, run `scripts/frontend-gate.sh schema` and `workflows`. Regenerate
   a stale contract with `scripts/generate-api-client.sh --write`, then inspect
   both `packages/api-client/openapi.json` and `packages/api-client/src/schema.d.ts`.
4. For Inertia, run `php artisan wayfinder:generate --with-form` and
   `php artisan typescript:transform` before checking TypeScript.
5. Browser CI uses stubs. Run live local journeys separately against Herd.
   Never add Playwright to Lefthook.

After `boost:update`, run `scripts/boost-sync-opencode-skills.sh`. Keep the root
product brief intact. Cloud connections and production credentials stay manual.
