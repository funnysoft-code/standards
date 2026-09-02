---
description: Linear-first workflow, git conventions, review, and harness growth.
---

# Workflow

## Linear first

Every change traces to an __TEAM__ issue. Use the `linear` skill. If no issue exists, create one before you write code.

- Parked decisions live on Linear. The issue body is the options and the current lean. Write pillar sentences and a git ADR only after the owner accepts the lean.
- Product issues are tracer-bullet vertical slices, not layer tickets. Harness, decision, research, and maintenance issues keep their existing shapes.

This file is what agents execute. [docs/06-engineering.md](docs/06-engineering.md) is the working agreement. Do not create or update Linear documents. Process and roadmap live in git. Binding of an Accepted ADR is squash-merge to the default branch.

## Git

One branch per change issue. Name it `type/__TEAM_SLUG__-NNN-short-description`. Types: `feat`, `fix`, `docs`, `chore`, `harness`, `infra`, `foundations`. PR #1 is a one-time bootstrap exception: multiple ADRs on one branch. After that merge, one issue, one PR.

Directory presence is not a switch. Do not stay on `main` because a folder is missing.

Create the branch when the issue's work starts. Active work is In Progress. If `main` already has this issue's WIP, move that WIP onto the branch. Do not start unrelated work on a dirty `main`.

Do not run Linear's create-git-branch commands (`issue start`, `create --start`). Never create both an `__TEAM_SLUG__-NNN` branch and a `type/slug` branch. Do not invent a second branch for the same issue.

Commits: Conventional Commits. Agents may make local checkpoint commits and push. The Review section says when the PR may open.

Merge still needs an explicit owner ask. Squash merge. The PR title is the final Conventional Commit. Delete the branch after merge. Never force-push to `main`.

## Review

Finished __TEAM__ work needs an adversary `approve` on a recorded SHA before the PR opens. Exempt only: typo-only, comment-only, or a one-line pointer with no behavior or process change. Exempt work may open the PR without that review.

Every adversary dispatch must pass an explicit model pin. Do not omit the pin. Do not inherit the parent model. Do not substitute a pin that is not listed here.

Cursor:

- Default: `cursor-grok-4.6-high-fast`. Ordinary __TEAM__ work, including reviews that have some complexity.
- Max: `gpt-5.6-sol-xhigh`. Only when the owner asks for max, or the review is really complex or extensive. Triggers live in `.cursor/agents/adversary.md`.

Grok Build:

- Default: `grok-4.6` high. Ordinary __TEAM__ work, including reviews that have some complexity.
- Max: `grok-4.6` extra high. Same max triggers as Cursor.

Codex:

- Default: `gpt-5.6-sol`. Ordinary __TEAM__ work, including reviews that have some complexity.
- Max: `gpt-5.6-sol` with extra-high reasoning. Same max triggers as Cursor.

Claude:

- Default: `claude-opus-4-6` high. Ordinary __TEAM__ work, including reviews that have some complexity.
- Max: `claude-opus-4-6` extra-high. Same max triggers as Cursor. Pins live in `.claude/agents/adversary.md`.

A Sol XHigh streak on one issue stops after 3 dispatches. The next review uses that harness default, even if the owner said to own the loop. The owner can ask for another max pass, which starts a new streak of 3. A new issue resets the count.

The verdict names the SHA. Findings are Critical, High, Medium, or Low. `approve` with leftover Medium or higher findings is not a pass. Fix every Critical, High, and Medium finding, then re-dispatch on the new SHA. The recorded `approve` that opens the PR may list Low findings only. Linear comments are for owner leans and findings that change the work, not process status.

In Review only when all of these are true:

- Acceptance criteria written and checked
- Dependencies resolved
- Local gates that exist have been run, including 100% product-code coverage
- Adversary approved a recorded SHA with no Medium or higher findings, or the change is exempt
- The PR is open

Any further edit, failed CI, or owner rejection returns the issue to In Progress and requires review again.

Only the parent sets In Review. The implementer must not mark the issue done or tell the owner the work landed.

Done is owner-accepted and merged to the default branch. Work with no Git artifact is a recorded exception.

## Retro

After any owner correction or discovered miss, run the `retro` skill.

## Harness

Keep the harness thin. Prefer editing an existing rule or skill over adding a new one.

Laptop API is Herd. Do not use Sail. Cursor Cloud is out.

Loose idea: do not auto-run grilling. Pause and ask the owner to invoke it. Leave Plan mode off during a grill. Grill is inquiry; Plan mode rushes a plan.

Non-trivial change: plan first, then execute in the same session.
