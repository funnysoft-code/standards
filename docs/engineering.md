# Engineering

Working agreement for nets, git, review, PHP conventions, and what done means.

Gates, include lists, and how to run them: [quality.md](quality.md). Harness: [harness.md](harness.md).

## Quality nets

Two nets. The same checks run at each net that can run them. Lefthook is an earlier copy of CI, not a different standard.

| Net | When |
| --- | --- |
| Commit-time Lefthook | On commit |
| Merge-time CI | On pull request |

Playwright TS is merge-time (needs a browser). Everything else that can run locally runs in Lefthook.

Human-readable failures. Zero-violation. Do not shrink a baseline. Do not add a temporarily-allowed list.

CI runners: Blacksmith ARM. Pin action SHAs. Do not default to untrusted public runners. No slop scan.

Laravel products (v1 quality-then-deploy, no semver):

- PRs: quality workflow (fold lint, tests, and security into it).
- Push to main: same quality, then Laravel Cloud deploy. Serialize deploys. PRs never deploy. No auto-version, no GitHub Release, no `dev` promote branch.

`scripts/lint-commit-msg.sh` runs on every PR. CI also lints the PR title (squash subject).

Do not use `--no-verify` unless the owner asks.

## Commits

Conventional Commits. Subject in imperative mood. One logical change per commit when you can.

Allowlist: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `build`, `perf`, `style`, `revert`. `scripts/lint-commit-msg.sh` is the shared check. Lefthook commit-msg and CI both call it.

`foundations` is a branch type only, not a commit type.

## Branches

`type/{team}-{NNN}-short-description`. Types: `feat`, `fix`, `docs`, `chore`, `harness`, `infra`, `foundations`. One issue, one branch, one PR.

Do not run `linear issue start`. Directory presence is not a switch. Do not stay on `main` because a folder is missing.

```
feat/f7t-128-stamp-peca-certa
harness/f7t-127-standards-repo
```

## Review

Adversary on a recorded SHA before the PR opens. Exempt: typo-only, comment-only, or a one-line pointer with no behavior or process change.

Every adversary dispatch uses the review route configured by the coordinator's environment. Provider, model, effort, and retry-streak choices are personal configuration, not shared standards.

Verdict: `approve`, `revise`, or `block`. Findings Critical, High, Medium, Low. `approve` with leftover Medium or higher is not a pass. Fix Critical, High, and Medium, then re-dispatch on the new SHA. The recorded `approve` that opens the PR may list Low only. No compliments.

If the diff changes a screen, missing mock/route screenshots at both viewports is Critical.
If the diff changes harness files, a procedure inside a rule or an always-true constraint inside a skill is Critical.
If the diff ships a finishable job, missing product-code coverage under 100% is Critical.

In Review only when acceptance criteria are checked, dependencies resolved, local gates that exist have been run, adversary approved (or exempt), and the PR is open. Only the coordinator sets In Review. A subagent must not mark the issue done.

## Merge

Done is owner-accepted and merged to the default branch. Squash merge. Owner merges. PR title is the final Conventional Commit. Delete the branch. Never force-push `main`. Work with no Git artifact is a recorded exception.

Only the coordinator may commit and push, and only with owner authorization. Subagents return changes without mutating Git or lifecycle state. Merge still needs an explicit owner ask.

## ADRs

Write an ADR when the choice is irreversible, cross-cutting, the owner asked, or an open pillar decision is resolved.

Copy [adr/0000-template.md](adr/0000-template.md). Proposed in a PR. Owner approval authorizes one Accepted commit on that branch, then squash-merge. Binding only after squash-merge to the default branch. Accepted on an open PR is not binding.

After Accepted, Decision and Consequences stay immutable. Rotting facts may be patched and dated. A change to the choice itself supersedes. New ADRs list rejected alternatives in git.

Product ADRs live in the product. Playbook ADRs live here. See [adr/README.md](adr/README.md).

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

Coverage via `vendor/bin/pest`, not `artisan test` (providers load before PCOV). Arch tests: no `dd`/`dump`/`ray`; strict types; no BaseAction/repository interfaces; throttle every product route; Actions do not persist; validation on FormRequest; writes use `validated()` + `Data::from`.

Stubs/generators for Action, Request, Data, Repository, Controller. Do not hand-write a new one without the generator once stubs exist.

Never commit secrets. `.env` untracked. If a secret appears in a diff, stop and rotate.

## Shared Laravel account policy

Both Laravel variants start with individual users. No team records or organization module are required to provision or sign in. Product-specific clinical, motorsport, billing, AI, and other domain dependencies are not starter requirements.

`config/funnysoft.php` owns shared application settings, starting with public registration, disabled by default. Keep the complete registration flow installed. Enforce its switch both when registering routes/features and at request time, so cached routes and stale pages cannot reopen registration. Visible sign-up entry points follow the same setting. Document rebuilding configuration and route caches after changing it.

Fortify with the session-backed web guard owns login, logout, password reset, and recent confirmation. Application access requires verified email. Unverified users can reach the verification notice, resend action, verification-link handler, and logout. Account settings support name/email edits, password changes, and deletion. Changing email clears verification and requires it again. Each flow needs usable success, validation, loading, and failure states.

A first-user command creates an unverified account and sends its verification message even when public registration is disabled. Local mail must be retrievable without production credentials. Provisioning does not bypass verification.

Include passkey enrollment, login, safe credential listing, removal, and confirmation for sensitive actions. Include optional authenticator-app 2FA enrollment, confirmation, recovery codes, login challenges, and removal. Use supported Fortify/passkey ceremonies. Password login challenges confirmed authenticator enrollment; passkey login uses WebAuthn user verification without a second TOTP challenge. Login alone does not grant recent confirmation.

Email/password changes, deletion, passkey changes, authenticator management, and recovery-code access require the same recent password-or-passkey confirmation boundary. Name-only changes do not. JSON clients handle a 423 response by confirming, then retrying the intended action once. Do not add a raw-current-password requirement that rejects successful passkey confirmation.

Laravel remains the account-policy authority in API + Next. Inertia shares public capabilities through props. API + Next exposes them through a public capabilities resource, with no second frontend registration switch. Account HTTP contracts follow the selected variant. API verification links authorize the public UUID and current email hash, not the integer database key. Passkey resources expose safe public metadata, never credential payloads.

Standalone Next has no generated account system. Its existing site/data choices remain independent of this Laravel account policy.

## Frontend policy

oxc family. No ESLint/Prettier. Vite/Inertia apps: `vp lint` / `vp fmt`. Next apps: `oxlint --deny-warnings` / oxfmt. `tsc --noEmit`. React Doctor: zero warnings. Fix. Do not disable.

Vitest 100% line coverage of authored `lib/` (and workspace packages when they exist). Not page shells. A component with real logic moves into `lib/` first.

100% Pest line coverage of named product code. Not branch coverage. Coverage is not a reason to test private methods. 100% Pest type-coverage. PHPStan max. Larastan. Pest PHPStan plugin. No bleedingEdge. No new baseline.

Named gates and include lists: [quality.md](quality.md).

## Definition of done

A change is done when all of these are true:

- Owner-accepted and squash-merged to the default branch. Work with no Git artifact is a recorded exception.
- Traced to a Linear issue.
- Matches an accept-and-merged ADR when the change is a decision.
- Product-code line coverage 100%. Pest type-coverage 100% on Laravel products. PHPStan max, Rector, Pint, oxc, TypeScript, and React Doctor are clean.
- Design loop closed when the diff changes a screen ([design.md](design.md)).
- Docs updated in the same PR when behavior or a decision changed.
- No new baseline, no skipped gate, no secret in tree.
