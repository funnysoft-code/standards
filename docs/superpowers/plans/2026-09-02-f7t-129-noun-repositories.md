# peca-certa noun folders and repositories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** peca-certa PHP matches the Inertia-monolith variant: repositories persist, Actions do not, tests live under `tests/Http/{Noun}`.

**Architecture:** Move files by noun. Replace `app/Queries` with `app/Repositories/{Noun}`. Delete List/Show Actions. Rename remaining Actions to `*Action`. Architecture tests lock the shape. Keep 100% coverage while files move. Supplier clients stay in `app/Services/{Name}`.

**Tech Stack:** peca-certa PHP 8.5, Pest, PHPStan max.

**Spec:** inertia-monolith variant + spec issue 3
**Issue:** [F7T-129](https://linear.app/funnysoft/issue/F7T-129)
**Blocked by:** F7T-128

## Global Constraints

- Branch `refactor/f7t-129-noun-repositories`
- UUID PKs stay. No price migration.
- `*Action` suffix. One `execute()`. Named args at call site.
- Actions must not contain `::query(`, `::create(`, `->save(`.
- camelCase Data props stay.
- `per_page` may stay 10.
- Allowlists on the repository. Unknown keys 422. peca-certa may keep `q` and `scope` as named allowlist keys.
- Stubs for Action, Request, Data, Repository, Controller.
- Do not touch `workers/` or Playwright sidecars.

## Nouns (from current app/)

| Noun | Today |
| --- | --- |
| SearchRuns | StartPartsSearch, ListSearchRuns, AddSearchRunSuppliers, controllers, queries |
| Findings | PersistLookupFindings, ExpandUnavailableFindings, ListSearchRunFindings, MapVariantToFindingAttributes |
| Conversations | StartChatMessage, ListConversations, ArchiveConversation, chat controllers |
| Users | Admin invite/role/delete, Fortify CreateNewUser |
| Roles | SyncRolePermissions |
| SupplierDefaults | UpdateUserSupplierDefaults |
| Analytics | BuildProcurementAnalytics |
| Lookups | PriceSupplierJob callers, Search*Parts Actions (keep Search* as Actions that call Services, persist via Finding/SearchRun repositories) |

Do not noun-wrap AutoDelta/Europecas/etc. Those stay Services.

---

### Task 1: Stubs and arch tests (red)

- [ ] **Step 1:** Add `stubs/repository.stub`, update `stubs/action.stub` to `final class {Name}Action` with `execute(data: {Data} $data)`.
- [ ] **Step 2:** Add Pest tests in `tests/Architecture/` (keep or extend `tests/Unit/ArchTest.php`):

```php
it('keeps action persistence on repositories', function (): void {
    // same regex as Apex over app/Actions
});
it('does not introduce BaseAction or BaseRepository', function (): void {});
it('does not declare repository interfaces', function (): void {});
it('forbids pass-through list actions', function (): void {
    expect(class_exists(\App\Actions\SearchRuns\ListSearchRunsAction::class))->toBeFalse();
    expect(class_exists(\App\Queries\ListSearchRunsQuery::class))->toBeFalse();
});
```

- [ ] **Step 3:** Run those tests. Expected: fail (ListSearchRuns still exists, Actions persist).
- [ ] **Step 4:** Commit `test: add repository architecture tests`

---

### Task 2: SearchRuns vertical (the template)

Move one noun fully so later nouns copy the shape.

- [ ] **Step 1:** Create `app/Repositories/SearchRuns/SearchRunRepository.php` with `list()`, `show()`, `create()` / persist methods. Move logic out of `ListSearchRunsQuery` and persist calls out of `StartPartsSearch`.
- [ ] **Step 2:** `StartPartsSearch` → `app/Actions/SearchRuns/StartPartsSearchAction.php`. Controller calls `$action->execute(data: StartPartsSearchData::from($request->validated()))`.
- [ ] **Step 3:** Delete `ListSearchRuns` Action. `SearchRunController@index` calls `$searchRuns->list()`.
- [ ] **Step 4:** Move tests to `tests/Http/SearchRuns/`. Keep assertions. Coverage must stay 100%.
- [ ] **Step 5:** Run `vendor/bin/pest --compact tests/Http/SearchRuns` and `vendor/bin/pest --type-coverage --min=100`.
- [ ] **Step 6:** Commit `refactor: move SearchRuns onto a repository`

---

### Task 3: Remaining nouns

Repeat Task 2 for Findings, Conversations, Users, Roles, SupplierDefaults, Analytics. One commit per noun. After each: pest on that folder + full type-coverage if cheap, full coverage before the last commit.

Search*Parts Actions: rename to `SearchEuropecasPartsAction` etc. They call Services, then Finding repository persist. They must not `Finding::create` directly.

---

### Task 4: Green arch tests and generators

- [ ] **Step 1:** Arch tests from Task 1 pass.
- [ ] **Step 2:** `php artisan` make commands or composer scripts that copy stubs into noun folders. Document in `docs/04-backend.md`.
- [ ] **Step 3:** Full `scripts/php-gate.sh all`. Exit 0.
- [ ] **Step 4:** Adversary + PR citing F7T-129.
