# FunnySoft engineering playbook

**Status:** Proposed
**Date:** 2026-09-02
**Owners:** João
**First consumer:** peca-certa (Inertia monolith). Apex Scout v2 is the API+Next reference and is not stamped in this pass.

## What this is

A git repository, `github.com/funnysoft-code/standards`, that holds the engineering rules FunnySoft products share. Products copy native harness trees from templates at a pinned tag. They do not symlink. Cloud Agents only see files inside the product tree.

peca-certa stays a Laravel + Inertia monolith. It does not become an API+Next monorepo. It keeps Horizon. It does not import nwidart modules, OpenAPI, Cloud managed queues, Vercel, Expo, or Sail.

## Three layers

1. **Playbook** (this repo). True for every FunnySoft Laravel + React product.
2. **Stack variant.** Inertia monolith, API+Next, Next-only. Backend layout, HTTP contract, deploy defaults.
3. **Product repo.** Vision, domain language, named deviations.

AGENTS.md in a product is short. It points at the playbook pin, the variant doc, and the product pillars.

## Approach

Docs + templates + `scripts/stamp.sh`. A product records `STANDARDS_VERSION` (git tag). The stamp copies harness trees, shared scripts, Lefthook, and playbook-required docs. Product overlays (Linear team, Boost path, Horizon supervisors, Wayfinder) are not overwritten.

Rejected: a CLI like f7t-stack, git submodules, home-harness as SSOT, authoring the playbook only inside peca-certa.

f7t-stack stays a Next scaffolder. Do not overload it.

## Repository layout (this repo, after issue 1)

```
README.md
STANDARDS.md                 Short index. Points at docs/.
docs/
  README.md                  Reading order
  engineering.md             Nets, gates, git, review, done
  harness.md                 Four trees, Boost, parity, retro, overlay
  design.md                  Visual loop, mock store, screenshots
  quality.md                 Named gates and include lists
  variants/
    inertia-monolith.md
    api-next.md
    next-only.md
  adr/
    0000-template.md
    README.md
templates/
  harness/                   .cursor .grok .agents .claude .codex bodies
  scripts/                   gate scripts, harness-parity, lint-commit-msg, screenshot
  lefthook.yml
  ci/                        quality.yml shape
packages/
  boost-guidelines/          Copied from Apex. Leave Apex copy in place this pass.
scripts/
  stamp.sh
  harness-parity.sh          Used here to check templates themselves
```

English for playbook, ADRs, templates, commit messages. Product UI locale is product.

## This pass

Apex Scout v2 is not a consumer. peca-certa only.

Five F7T issues, one PR each:

1. Create `funnysoft-code/standards` with playbook docs, variants, templates, stamp script, Boost guidelines copy.
2. Stamp peca-certa: four harness trees, `scripts/` (retire `bin/`), Lefthook (retire vite-plus hooks), quality CI + Cloud deploy on main, short AGENTS.md, product pillars, ADRs for deviations, drop `docs/agent/progress.md`.
3. Noun folders + repositories. `tests/Http/{Noun}`. Architecture tests. Stubs.
4. `design/` SSOT, DESIGN.md, mocks/screenshots for existing peca-certa screens (full Apex loop).
5. Vitest 100% on `resources/js/lib`. Playwright TS replaces Pest Browser. No Maestro.

Linear-first. Team F7T. Branch `type/f7t-NNN-short-description`. Adversary approve on a recorded SHA before the PR. Agents may commit and push. Owner merges. Squash.

# Playbook

## Harness

Cursor, Grok Build, Codex, and Claude are laptop process harnesses. Prefer whichever the human opened.

Each harness owns a native tree. Bodies are copied. Do not symlink. `scripts/harness-parity.sh` fails if a name is missing or a symlink remains. It does not merge bodies.

| Tree | Role |
| --- | --- |
| `.cursor/` | Rules, skills, adversary agent, authored MCP |
| `.grok/` | Rules, skills, adversary, MCP toml |
| `.agents/` + `.codex/` | Codex rules/skills (Codex has no rules directory) and MCP |
| `.claude/` | Claude Code rules/skills. No root `CLAUDE.md`. |

Creative-mode is a requestable Cursor rule and a skill in the other trees. Grok would always-load it if it lived in `.grok/rules`.

Laravel Boost is the Laravel agent layer, not the process harness. Boost lives in the Laravel app tree (repo root on an Inertia monolith, `services/api` on an API). Boost must not overwrite root `AGENTS.md`. Commit `boost.json` and generated Boost skills. `funnysoft/boost-guidelines` ships API lines and Inertia+React lines. Inertia lines render only when those packages are installed.

Authored MCP: `.cursor/mcp.json`, `.grok/config.toml`, `.codex/config.toml`. Boost + Mobbin. Do not set `cwd` in the Cursor file.

Keep the harness thin. Rule vs skill vs hook:

- Rule: true whenever it applies. Always-on may have a session off-switch. Requestable starts on a phrase.
- Skill: a procedure.
- Hook: a hard block the agent cannot skip. Add one only when a rule keeps failing.

Do not add a skill for a one-line reminder. Do not add a hook for a style lint already covers. Do not add a rule that is true only inside one package.

A miss or owner correction runs the retro skill. The smallest durable fix lands on the same branch and PR. Do not write a long postmortem. The harness change is the record. Comment the miss on the Linear issue.

Do not auto-run grilling. Pause and ask the owner to invoke it. Leave Plan mode off during a grill.

Stack rules wait for their code. Do not copy personal Cursor rules unless they are true for every engineer.

Cursor Cloud and Sail are out of this playbook. Laptop API is Herd. Do not add Dockerfile/Sail wrappers unless a later issue names Cloud Agents.

### Always-on overlay

No off-switch except creative-mode:

- **caveman.** Chat voice. Full intensity.
- **ponytail.** Smallest change. YAGNI ladder. Bug fix is root cause.
- **unslop.** Persisted prose. No em dashes. No emoji.
- **product.** Craft over CRUD. Works-but-ugly is a fail. Quality zero-violation. Domain pointers.
- **workflow.** Linear-first, git, adversary, retro.
- **design.** Mock loop. DESIGN.md is SSOT.

Home BLUF loses inside a product repo that stamps caveman.

Skills: grilling, adr, retro, linear (team from product), design-mock, frontend-ui.
Agent: adversary.

Linear CLI, not Linear MCP. Workspace `funnysoft`. Do not create or update Linear documents. Process and roadmap live in git. Parked options and the current lean live on the issue body.

Product issues are tracer-bullet vertical slices (schema + HTTP + UI + tests when those layers exist). Harness, decision, research, and maintenance keep their existing shapes.

## Git and review

Conventional Commits. Allowlist: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `build`, `perf`, `style`, `revert`. `scripts/lint-commit-msg.sh` is the shared check. Lefthook commit-msg and CI both call it. CI also lints the PR title (squash subject).

Branch: `type/{team}-{NNN}-short-description`. Types: `feat`, `fix`, `docs`, `chore`, `harness`, `infra`, `foundations`. One issue, one branch, one PR. Do not run `linear issue start`. Directory presence is not a switch. Do not stay on `main` because a folder is missing.

Adversary on a recorded SHA before the PR opens. Exempt: typo-only, comment-only, or a one-line pointer with no behavior or process change.

Every adversary dispatch passes an explicit model pin. Do not inherit the parent model.

| Harness | Default | Max |
| --- | --- | --- |
| Cursor | `cursor-grok-4.6-high-fast` | `gpt-5.6-sol-xhigh` |
| Grok Build | `grok-4.6` high | `grok-4.6` extra high |
| Codex | `gpt-5.6-sol` | `gpt-5.6-sol` extra-high reasoning |
| Claude | named in `.claude/agents/adversary.md` at issue 1 (high vs extra-high split, same triggers as Cursor max) | same file |

A Sol XHigh streak on one issue stops after 3 dispatches. Next review uses that harness default. Owner can start a new streak of 3.

Verdict: `approve`, `revise`, or `block`. Findings Critical, High, Medium, Low. `approve` with leftover Medium or higher is not a pass. Fix Critical, High, and Medium, then re-dispatch on the new SHA. The recorded `approve` that opens the PR may list Low only. No compliments.

If the diff changes a screen, missing mock/route screenshots at both viewports is Critical.
If the diff changes harness files, a procedure inside a rule or an always-true constraint inside a skill is Critical.
If the diff ships a finishable job, missing product-code coverage under 100% is Critical.

In Review only when acceptance criteria are checked, dependencies resolved, local gates that exist have been run, adversary approved (or exempt), and the PR is open. Only the parent sets In Review. The implementer must not mark the issue done.

Done is owner-accepted and merged to the default branch. Squash merge. PR title is the final Conventional Commit. Delete the branch. Never force-push `main`. Work with no Git artifact is a recorded exception.

Do not use `--no-verify` unless the owner asks.

## ADRs

Write an ADR when the choice is irreversible, cross-cutting, or the owner asked, or an open pillar decision is resolved.

Copy `docs/adr/0000-template.md`. Proposed in a PR. Owner approval authorizes one Accepted commit on that branch, then squash-merge. Binding only after squash-merge to the default branch. Accepted on an open PR is not binding.

After Accepted, Decision and Consequences stay immutable. Rotting facts may be patched and dated. A change to the choice itself supersedes. New ADRs list rejected alternatives in git.

Keep them short. A reader decides in two minutes whether it affects them.

Product ADRs live in the product. Playbook ADRs live here.

## Quality nets

Two nets. The same checks run at each net that can run them. Lefthook is an earlier copy of CI. Human-readable failures. Zero-violation. Do not shrink a baseline. Do not add a temporarily-allowed list.

| Net | When |
| --- | --- |
| Commit-time Lefthook | On commit |
| Merge-time CI | On pull request |

Playwright TS is merge-time (needs a browser). Everything else that can run locally runs in Lefthook.

CI runners: Blacksmith ARM. Pin action SHAs. Do not default to untrusted public runners. No slop scan.

peca-certa pipeline (v1 Apex quality-then-deploy, no semver):

- PRs: quality workflow (fold lint/tests/security into it).
- Push to main: same quality, then Laravel Cloud deploy. Serialize deploys. PRs never deploy. No auto-version, no GitHub Release, no `dev` promote branch.

`scripts/lint-commit-msg.sh` and harness-parity run on every PR.

## Quality gates

PHP:

- PHPStan max. Larastan. Pest PHPStan plugin. No bleedingEdge. No new baseline.
- Rector clean on the agreed set (Laravel current + Pest coding style + PHP current).
- Pint, Laravel preset. `--parallel --test`.
- Pest 5. 100% line coverage of named product code. Not branch coverage. Coverage is not a reason to test private methods. Run `vendor/bin/pest`, not `artisan test` (providers load before PCOV).
- 100% Pest type-coverage.
- Pest architecture tests lock the layer shape.
- Test-first is encouraged, not required. Do not add TIA, sharding, or the Pest agent plugin until the suite is slow.

JS/TS:

- oxc family. No ESLint/Prettier.
- Vite/Inertia apps: `vp lint` / `vp fmt` (vite-plus).
- Next apps: `oxlint --deny-warnings` / oxfmt.
- `tsc --noEmit`.
- React Doctor: zero warnings. Fix. Do not disable.
- Vitest 100% line coverage of authored `lib/` (and workspace packages when they exist). Not page shells. A component with real logic moves into `lib/` first.

E2E:

- Inertia monolith: Playwright TS. Pest Browser is retired (peca-certa issue 5).
- API+Next: Playwright TS + `tests/workflows.yml` registry. Maestro when a customer mobile app exists.
- Stubbed Playwright on CI. Live against Herd on the laptop.

Product-code include list is per variant. Out of the percentage: vendor, generated types, mocks, DESIGN.md, tokens as fixtures, config, providers, makers, route files, migrations, factories, page/route files.

## PHP conventions

Latest stable PHP and Laravel. bun for JS. PostgreSQL. No MySQL. No second database. `nunomaduro/essentials`.

`declare(strict_types=1)`. Classes `final` (`final readonly` when stateless). Constructor promotion. Explicit return types. `env()` only in `config/`. `Model::query()`, never `DB::` for queries. PHPDoc generics. `casts()` method, not `$casts`. Models unguarded. `#[Hidden]` not `$hidden`. Multi-step writes in `DB::transaction()`. Secrets: `#[SensitiveParameter]`. Named arguments at the Action call site.

Octane with FrankenPHP in production. No Swoole, no RoadRunner. No request state in statics or singletons. Prefer `$this->app->scoped()`.

Fortify. Policies plus Spatie permission. Application code calls `can()` with a permission name, not `hasRole()` for feature access. No `Gate::before` super-admin. No wildcard permissions. No Spatie teams until a named org feature. Form Request `authorize()` calls the policy. Writes and owner-scoped reads go through a policy.

No repository interfaces. No `BaseAction` or `BaseRepository`. Constructor-inject concretes. After a second copy of the same algorithm, extract a named trait. No observers or view models as a parallel layer. No command bus. The Action is the write entry. One public `execute()`. `handle()` is for Jobs, Listeners, Commands.

Jobs: `ShouldQueue`, `Queueable`, `#[Timeout]` / `#[Tries]` / `#[Backoff]`, `failed()`.

Action class names take the `*Action` suffix (`CreateSearchRunAction`). One public `execute()`. Laravel 13 `make:action` output is renamed to that suffix. No `CreatePost` short form.

Events: past-tense names. `ShouldBroadcast` when live. `broadcastWith()` uses Data, never the raw model.

Horizon is the playbook queue runner. Redis protocol for cache, sessions, locks, rate limits, and Horizon queues. Session keys use a dedicated prefix or Redis DB index so a cache flush cannot drop sessions. Pest may use `array` / `sync`. Production cache/session/Valkey on Laravel Cloud. Laptop: Herd Redis. Eloquent strict in non-production (lazy load throws).

Every product HTTP route has a named rate limiter. Pest architecture test fails a product route without throttle. Exceptions: `/up`, `storage/{path}`, `_boost/*`. Do not treat WAF as a substitute.

Error bodies stay Laravel `{ message, errors }`. Do not switch to RFC 7807.

Unknown list query keys are 422. Allowlists live on the repository as public constants via a shared `ValidatesPublicQuery` (or Inertia equivalent) trait. Do not copy allowlist loops into each Request. Do not add a parallel `search` query key. Do not add `*IndexQuery` classes.

PATCH write Data uses Spatie `Optional`: omitted keys are not written. Do not invent a None sentinel. Do not use one Data class as both Request and HTTP response.

Repeat a test assertion twice, then add a TestCase helper. Idempotency keys wait for the first write that needs them. Seeders that fabricate product rows run in local and testing only.

Public identifiers are UUIDs. Integer ids never appear in HTTP. Primary key shape is variant.

New UUID columns use UUID v7 (`Str::uuid7()`).

Money is silent in the playbook. Each product ADRs it.

i18n is silent in the playbook. Each product ADRs it.

Theme is silent in the playbook. Product DESIGN.md names it.

`laravel/ai` for inference. Primary providers OpenAI and xAI. Live web search is Parallel.ai. Do not add Anthropic or Gemini as a primary without an ADR. No eval-framework product. Skipping an eval framework is not permission to skip evaluation. A shipped AI feature has a measurable user outcome. Not an agent platform. RAG when a named corpus needs it. Prefer CAG when the working set fits.

Full-text search, when needed: Scout + Algolia. Do not replace QueryBuilder with Algolia for structured filters.

Turnstile on login and public forms. Not reCAPTCHA or hCaptcha. Not on every authenticated request.

Reverb for websockets. Echo React on React apps. Not Pusher or Ably as the backend.

Object storage, when files are needed: Cloudflare R2 with `eu` jurisdiction. Not Laravel Cloud buckets. Visibility is bucket-level. Do not set Flysystem `visibility: public`.

Laravel Cloud compute, Postgres, and Valkey in EU Central (Frankfurt).

Resend, PostHog, Nightwatch, Blacksmith. No second email, analytics, or APM vendor. No Sentry beside Nightwatch.

Spatie extras (activitylog, pdf, medialibrary, sluggable, onboard, settings, webhooks) when a named feature needs them. Do not add unused composer deps.

Extract a package when a reason is named: intended OSS, known FunnySoft reuse, or a cleaner boundary. "Looks generic" is not a reason. Backend extracts use `spatie/package-skeleton-laravel`. Frontend primitives wait until a second app needs the same piece.

Cloudflare Workers only when all of these hold: edge or isolate scoped; a Laravel request or queued job is the wrong place; the reason is on the Linear issue; it is not a second backend or a BFF. Language is not a reason.

No empty config for unused vendors.

Untrusted markdown sanitizes on write and on render.

Pest hygiene: `Http::preventStrayRequests()`, `Process::preventStrayProcesses()`, `Sleep::fake()`, `freezeTime()` where the suite needs it.

Coverage via `vendor/bin/pest`. Arch tests: no `dd`/`dump`/`ray`; strict types; no BaseAction/repository interfaces; throttle every product route; Actions do not persist; validation on FormRequest; writes use `validated()` + `Data::from`.

Stubs/generators for Action, Request, Data, Repository, Controller. Do not hand-write a new one without the generator once stubs exist.

Never commit secrets. `.env` untracked. If a secret appears in a diff, stop and rotate.

## Design loop

Full Apex loop in every product.

Product design SSOT:

- Monorepo: `packages/design-system/DESIGN.md` + `mocks/`.
- Inertia monolith: `design/DESIGN.md` + `design/mocks/<slug>/`.

Mock folder:

```
index.html
mock.png
mock-mobile.png
route.png
route-mobile.png
```

Desktop 1440x900. Phone 390x844. One responsive `index.html`. Inline CSS. Token values copied from the product token file. No font CDN. No JS toolchain. Mobbin URLs in an HTML comment. Search Mobbin before HTML. If Mobbin tools are missing, stop. Do not invent URLs.

A new or changed screen is not implemented until `index.html`, `mock.png`, and `mock-mobile.png` exist. A UI change is not done until `route.png` matches `mock.png` and `route-mobile.png` matches `mock-mobile.png`, plus DESIGN.md.

If the owner has not named a direction, write `index-a.html` and `index-b.html`, screenshot both, stop until they pick. Offer two concrete options with a Mobbin screen each. Do not ask for vibe words.

Open Design is not in the harness. Do not wait for a daemon.

No purple gradient, Inter, or three equal feature cards. Do not invent a second typeface or component kit. shadcn/ui plus shadcn registries is the only web UI kit. Tailwind via that setup. Do not grow a parallel component library.

Storybook waits for the first shared primitive. It does not replace the route screenshot.

`scripts/screenshot.sh` is the shooter.

Craft over CRUD. Works-but-ugly is a fail.

## Scripts directory

`scripts/` not `bin/`. Shared names:

| Script | Job |
| --- | --- |
| `stamp.sh` | In this repo. Copy templates into a product at a pin. |
| `harness-parity.sh` | Names exist, no symlinks. |
| `lint-commit-msg.sh` | Conventional Commits allowlist. |
| `php-gate.sh` | `pint\|phpstan\|rector\|pest\|all` (Inertia monolith). API variant may keep `api-gate.sh`. |
| `frontend-gate.sh` | `lint\|typecheck\|test\|e2e\|doctor` (plus `schema\|workflows` on API+Next). |
| `screenshot.sh` | 1440x900 default, 390x844 phone. |
| `ci-changes.sh` | Optional path-area detection when the repo has areas. |

Product-only scripts (sidecars, worktrees) stay in `scripts/` and are not overwritten by stamp.

# Variants

## Inertia monolith

Laravel + Inertia + React 19 + Tailwind 4 + shadcn. Wayfinder. Spatie typescript-transformer. bun. vite-plus. Boost at repo root. Horizon. UUID primary keys allowed (`HasUuids`). camelCase Data / Inertia props. DB columns snake_case. One HTTP contract per app. Do not mix snake_case JSON and camelCase props in one app.

Write path: FormRequest (authorize + validate) → Data → Action::execute → repository persist → Inertia render or `to_route()`.

Read path: FormRequest validates query keys against repository allowlists. Controller calls `list()` / `show()` on the repository. No pass-through List/Show Actions. No Data object on list/show.

Controllers stay thin. `final`. Method-inject Actions and repositories. `#[CurrentUser]`.

Supplier HTTP/Playwright clients live in `app/Services/{Name}` as adapters. They are not nouns.

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

Tests: `tests/Http/{Noun}`, `tests/Unit` for pure mappers, `tests/Architecture`. Playwright in `e2e/` (after issue 5).

Passkeys stay when a login UI exists.

`resources/js/pages` kebab-case. Do not edit Wayfinder output or `generated.d.ts` by hand.

`per_page` default is product (peca-certa may keep 10). Apex API default 20 max 50 is the API+Next figure.

Laptop start stays Herd. No Sail.

## API+Next

Documented from Apex Scout v2. Not stamped this pass.

nwidart domain modules. Integer PK + `uuid` column. UUID v7. JsonResource. OpenAPI via Scramble Pro. Shared generated client. snake_case JSON. No typescript-transformer as the HTTP schema. Next on Vercel. Expo on the store path. Cloud managed queues are an Apex product deviation against this playbook's Horizon default. When Apex adopts the playbook it ADRs that deviation or switches.

## Next-only

Marketing/sites. bun, oxc, shadcn, design loop, Lefthook, Linear, adversary. No Laravel tree.

# peca-certa apply

## Deviations to ADR in the product

- Unique-login Horizon supervisors (`maxProcesses = 1`) and `SupplierSessionLock` keys.
- UUID primary keys (`HasUuids`).
- Decimal `findings.price` (EUR). Playbook is silent on money.
- pt-PT UI hardcoded in pages. Playbook is silent on i18n.
- Wayfinder + typescript-transformer.
- `design/` at repo root.
- Playwright sidecars (`zitania-search.ts`, `soulima-search.ts`) in `scripts/`.
- `workers/` Cloudflare Browser Rendering for unique-login catalogs. Named Workers checklist pass.
- Appearance cookie `system` / light / dark. DESIGN.md names the theme.
- Europeças cookie-jar policy (production keeps the session; other envs log out).

## Issue 2 process stamp (concrete)

- Copy four native trees from the pin. Product overlays: F7T in workflow/linear, peca-certa domain nouns in product.mdc, Boost MCP at repo `artisan`.
- Move `bin/*` to `scripts/`. Update composer, AGENTS, quality-gate callers, CI.
- Install Lefthook. Remove `.vite-hooks/_` and `core.hooksPath`.
- One quality workflow on PRs. Main: quality then Cloud deploy (current `deploy.yml` behavior, leftover lint/tests/security folded).
- Short root AGENTS.md. Product `docs/01-vision.md` … `docs/07-harness.md` as applied. No second wiki. Drop `docs/agent/progress.md`.
- No `CLAUDE.md`. Claude in `.claude/`.
- PHPStan drop `bleedingEdge`.
- React Doctor zero warnings (cleanup on this issue if needed).
- Session and cache drivers to Redis (Herd / Cloud). Pest stays array.
- Throttle remaining unthrottled product routes. Arch test.
- Pest arch tests for the layer rules that already hold. Repository persist tests wait for issue 3.
- Thin `design/DESIGN.md` so the design rule has a target. Full mocks are issue 4.
- Turnstile on login and public forms (peca-certa has none today).

## Issue 3 reshape

Replace `app/Queries` with repositories. Actions stop calling `::query` / `::create` / `->save`. Delete List/Show Actions. Rename remaining Actions to the `*Action` suffix. Move files under nouns. Move Feature tests to `tests/Http/{Noun}`. Stubs. Keep 100% coverage while files move. Architecture tests then lock persist-on-repository.

## Issue 4 design

`design/DESIGN.md` from current peca-certa look (not Apex Space Grotesk / `#e62425`). Mock every existing named screen. Shoot mock + route at both viewports. Mobbin citations. No visual language rewrite unless DESIGN.md says so.

## Issue 5 E2E/unit JS

`resources/js/lib` receives page helpers. Vitest 100% on that tree. Playwright TS in `e2e/` tagged per finishable job. Delete `tests/Browser`. Lefthook skips Playwright. CI runs it.

## Out of scope this pass

- Stamping Apex Scout v2.
- Other FunnySoft apps.
- nwidart modules in peca-certa.
- UUID PK → int PK + uuid column.
- Decimal → integer minor units.
- i18n extraction.
- Dark-first retrofit.
- Cursor Cloud / Sail.
- Semver tags / GitHub Releases / `dev` branch.
- Maestro.
- Moving `packages/boost-guidelines` out of Apex (copy only).

# Success

- `funnysoft-code/standards` exists, tagged, stampable.
- peca-certa pins that tag, parity passes, Lefthook equals CI quality, main deploys after quality.
- peca-certa PHP shape matches the Inertia variant (repositories, noun folders, arch tests).
- Design loop artifacts exist for existing screens.
- Pest Browser is gone. Playwright TS + Vitest 100% on `lib/` are the frontend nets.
- Apex Scout v2 is unchanged.
