# peca-certa process stamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** peca-certa runs the playbook process net: four harness trees, `scripts/`, Lefthook = quality CI, main deploys after quality.

**Architecture:** After F7T-127 tag `v0.1.0`, run stamp into peca-certa, then overlay product files (pillars, Redis, throttle, Turnstile, PHPStan, React Doctor). Do not reshape `app/` nouns (F7T-129).

**Tech Stack:** peca-certa Laravel 13 + Inertia. Herd. Blacksmith. Laravel Cloud deploy secrets already on the repo.

**Spec:** `~/Code/funnysoft/standards/docs/superpowers/specs/2026-09-02-engineering-playbook-design.md`
**Issue:** [F7T-128](https://linear.app/funnysoft/issue/F7T-128)
**Blocked by:** F7T-127

## Global Constraints

- Branch `harness/f7t-128-peca-certa-stamp` from peca-certa `main`.
- Do not stay on peca-certa `main` (it is already ahead). Move WIP off main first if dirty.
- `STANDARDS_VERSION=v0.1.0`
- `--team F7T --team-slug f7t --product-blurb "R2CZ Auto Finder" --boost-artisan artisan --design-root design`
- No Sail. No Cursor Cloud. No `CLAUDE.md`.
- Quality-gate exit codes may change with script names; update `bin/quality-gate.sh` callers by deleting `bin/` after copy.
- Pre-push currently `.vite-hooks/_`. Remove `core.hooksPath` after Lefthook install.
- Adversary before PR. Cite F7T-128.

## File map (peca-certa)

Stamp overwrites: `.cursor/`, `.grok/`, `.agents/`, `.codex/`, `.claude/`, `lefthook.yml`, `scripts/harness-parity.sh`, `scripts/lint-commit-msg.sh`, `scripts/php-gate.sh`, `scripts/frontend-gate.sh`.

Keep and move: `bin/quality-gate.sh` → retire in favor of php-gate+frontend-gate; `bin/zitania-search.ts`, `bin/soulima-search.ts`, `bin/worktree-*.sh`, `bin/coverage.sh` → `scripts/`.

Write: `AGENTS.md` (short), `docs/01-vision.md` … `docs/07-harness.md`, `docs/adr/*` deviations, `design/DESIGN.md` thin, `STANDARDS_VERSION`, `.github/workflows/quality.yml` + deploy-on-main, delete `docs/agent/progress.md`, retire `lint.yml`/`tests.yml`/`security.yml` as dispatch-only or delete.

---

### Task 1: Branch and stamp

- [ ] **Step 1:** `linear issue update F7T-128 --state "In Progress"`
- [ ] **Step 2:** In peca-certa: `git checkout -b harness/f7t-128-peca-certa-stamp`
- [ ] **Step 3:** Run stamp:

```bash
~/Code/funnysoft/standards/scripts/stamp.sh \
  --target ~/Code/funnysoft/peca-certa \
  --team F7T --team-slug f7t \
  --product-blurb "R2CZ Auto Finder for a Portuguese workshop" \
  --boost-artisan artisan \
  --design-root design
```

- [ ] **Step 4:** `scripts/harness-parity.sh` in peca-certa. Expected: ok.
- [ ] **Step 5:** Commit `chore: stamp FunnySoft standards v0.1.0`

---

### Task 2: Retire bin/ and vite-plus hooks

- [ ] **Step 1:** `git mv bin/zitania-search.ts bin/soulima-search.ts bin/worktree-create.sh bin/worktree-remove.sh bin/coverage.sh bin/make-smoke-test.php scripts/` (create `scripts/` if stamp did not). Update composer.json `test:unit` and AGENTS references from `bin/` to `scripts/`.
- [ ] **Step 2:** Delete `bin/quality-gate.sh` after php-gate/frontend-gate cover the same steps (wayfinder drift, typescript:transform drift stay as extra jobs in `scripts/php-gate.sh` or a `scripts/quality-gate.sh` wrapper that calls both plus drift). Wrapper is allowed. peca-certa-only drift:

```bash
# scripts/quality-gate.sh calls php-gate all, frontend-gate lint/typecheck/test/doctor,
# php artisan wayfinder:generate --with-form (git diff), php artisan typescript:transform (hash diff)
```

- [ ] **Step 3:** `lefthook install`. `git config core.hooksPath .git/hooks` (Lefthook default). Remove `.vite-hooks/` from the tree if nothing else needs it. Confirm `git config --get core.hooksPath` is not `.vite-hooks/_`.
- [ ] **Step 4:** Commit `chore: move sidecars to scripts and switch Lefthook`

---

### Task 3: CI quality + deploy on main

- [ ] **Step 1:** Replace `.github/workflows/ci.yml` with stamped `quality.yml` (or keep name `ci.yml` if deploy.yml `uses:` it). Keep `workflow_call` so deploy can call it.
- [ ] **Step 2:** Keep deploy.yml behavior: push main → quality → Cloud curl. Fold `lint.yml` / `tests.yml` / `security.yml` into quality or leave workflow_dispatch stubs. Do not deploy on PRs.
- [ ] **Step 3:** commit-lint job must pipe PR title through `scripts/lint-commit-msg.sh`.
- [ ] **Step 4:** Commit `ci: mirror Lefthook quality and keep main Cloud deploy`

---

### Task 4: Product pillars and AGENTS.md

- [ ] **Step 1:** Rewrite root `AGENTS.md` to ~60 lines: what peca-certa is, repo map, pointer to playbook pin `v0.1.0`, variant inertia-monolith, product docs, F7T, Herd `peca-certa.test`, Horizon unique-login note. Load `.cursor` / `.grok` / `.agents` / `.claude` native tree only.
- [ ] **Step 2:** Add `docs/01-vision.md` (workshop parts search), `02-scope.md`, `03-architecture.md` (Inertia monolith, Horizon, workers checklist pass), `04-backend.md` (as applied), `05-frontend.md`, `06-engineering.md` (pointer + F7T), `07-harness.md`.
- [ ] **Step 3:** Add `docs/adr/` for deviations listed in the spec (Horizon unique-login, UUID PKs, decimal prices, pt-PT hardcoded, Wayfinder, design/, sidecars, workers, appearance, Europeças cookie jar). Status Proposed then Accepted on this PR after owner ok (bootstrap exception: several ADRs on one PR, same as Apex PR #1).
- [ ] **Step 4:** Delete `docs/agent/progress.md`. Confirm ArchTest that forbids extra AGENTS.md still passes. Confirm no `CLAUDE.md`.
- [ ] **Step 5:** Thin `design/DESIGN.md` (current look, system appearance, shadcn, no Apex red). Mocks are F7T-130.
- [ ] **Step 6:** Commit `docs: add peca-certa pillars and deviation ADRs`

---

### Task 5: Runtime playbook gaps

- [ ] **Step 1:** PHPStan: remove `phar://phpstan.phar/conf/bleedingEdge.neon`. Run `vendor/bin/phpstan analyse --memory-limit=2G`. Fix any new issues from dropping bleedingEdge (should be fewer, not more).
- [ ] **Step 2:** `.env.example` `SESSION_DRIVER=redis` `CACHE_STORE=redis`. Keep testing phpunit.xml array/sync. Document Herd Redis. Do not print secrets.
- [ ] **Step 3:** Throttle every product route except `/up`. Add Pest arch test copied from Apex `it('throttles every http route except health')` adapted to peca-certa URIs. Run it red, add middleware, run green.
- [ ] **Step 4:** React Doctor zero warnings: `bunx --bun react-doctor@0.9.12 resources/js --no-telemetry -y` (or the project's current invocation). Fix warnings. Gate must fail on warnings.
- [ ] **Step 5:** Turnstile on login + public forms (invite accept). Follow Turnstile skill if present. Verify siteverify server-side. Keys in env example as placeholders.
- [ ] **Step 6:** Pest arch: no dd/dump/ray; strict types. Keep existing php/strict/laravel/security presets if they still pass after stamp (controller `not->toBeUsed` may fight Wayfinder; do not drop without a replacement that still forbids business logic in controllers).
- [ ] **Step 7:** Run `scripts/quality-gate.sh` (or php-gate all + frontend-gate). Must exit 0.
- [ ] **Step 8:** Commit `fix: redis sessions, route throttles, Turnstile, Doctor, PHPStan max`

---

### Task 6: Review and PR

- [ ] **Step 1:** Adversary on recorded SHA. Pin `grok-4.6` high (this session is Grok Build) or Cursor pin if on Cursor. Fix Medium+.
- [ ] **Step 2:** Open PR. Title cites F7T-128. Do not merge until owner asks.
