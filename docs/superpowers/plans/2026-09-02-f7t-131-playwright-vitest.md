# peca-certa Playwright TS and Vitest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pages are Playwright TS E2E. `resources/js/lib` has Vitest 100% line coverage. Pest Browser is gone.

**Architecture:** Move helpers from `resources/js/pages/**` into `resources/js/lib`. Vitest covers `lib/**/*.ts`. Playwright specs in `e2e/` tagged per finishable job. Lefthook skips Playwright. CI runs it. No Maestro.

**Tech Stack:** Vitest, Playwright TS, bun, existing Laravel Pest for PHP.

**Spec:** frontend tests + spec issue 5
**Issue:** [F7T-131](https://linear.app/funnysoft/issue/F7T-131)
**Blocked by:** F7T-130

## Global Constraints

- Branch `test/f7t-131-playwright-vitest`
- Do not unit-test page tsx shells
- PHP 100% line + type-coverage stay
- Cypress is out. Maestro is out
- `frontend-gate.sh test` = vitest coverage 100% on lib
- `frontend-gate.sh e2e` = playwright, CI only

## Jobs to cover (Playwright tags)

`login`, `parts-search`, `parts-show`, `chat`, `analytics`, `settings-profile`, `admin-users`

Map from current `tests/Browser`.

---

### Task 1: Vitest lib surface

- [ ] **Step 1:** Add `vitest.config.ts` with `include: ['resources/js/lib/**/*.test.ts']`, `coverage.include: ['resources/js/lib/**/*.ts']`, `thresholds.lines: 100`. Exclude `*.d.ts`.
- [ ] **Step 2:** Move `resources/js/pages/admin/users/helpers.ts` and any other non-tsx helpers into `resources/js/lib/`. Update imports.
- [ ] **Step 3:** Write colocation tests `resources/js/lib/**/*.test.ts`. Run `bunx vitest run --coverage`. Expected 100% lines on lib.
- [ ] **Step 4:** Wire `scripts/frontend-gate.sh test` to that command. Lefthook already calls it.
- [ ] **Step 5:** Commit `test: add Vitest 100% coverage on resources/js/lib`

---

### Task 2: Playwright TS

- [ ] **Step 1:** Add `playwright.config.ts` (bun). Base URL `https://peca-certa.test`. CI uses the app's test user via env placeholders, never committed passwords.
- [ ] **Step 2:** For each Browser Pest spec, write `e2e/<job>.spec.ts` with tag `@<job>`. Use `waitForEvent('networkidle')` equivalent: Playwright `waitForLoadState('networkidle')` after navigation. No `sleep()`.
- [ ] **Step 3:** Run locally until green against Herd.
- [ ] **Step 4:** CI job `e2e` on quality workflow. Lefthook must not run Playwright (confirm glob).
- [ ] **Step 5:** Delete `tests/Browser` and Pest browser timeout in `tests/Pest.php`. Remove Browser suite from phpunit.xml.
- [ ] **Step 6:** Full quality gate exit 0.
- [ ] **Step 7:** Adversary + PR citing F7T-131.

---

## Spec coverage (F7T-128–131)

| Spec item | Issue |
| --- | --- |
| Four trees, scripts/, Lefthook, CI+deploy, pillars, Redis, throttle, Doctor, Turnstile, PHPStan | F7T-128 |
| Repositories, nouns, *Action, tests/Http | F7T-129 |
| design/ mocks + screenshots | F7T-130 |
| Vitest lib 100%, Playwright TS, drop Pest Browser | F7T-131 |
