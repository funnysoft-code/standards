---
name: linear
description: Drive Linear team __TEAM__, issue lifecycle, labels, projects, and CLI usage.
---

# Linear

Use the `linear` CLI. Workspace `funnysoft` is the default. Team is `__TEAM__`. Do not use the Linear MCP.

## Issue lifecycle

Backlog (uncommitted idea or parked lean), Todo (ready: dependencies and criteria resolved), In Progress, In Review, Done. Use Canceled for dropped work, with a one-line reason. Use Duplicate only to close a duplicate, and link it with `linear issue relation add __TEAM__-NNN duplicate __TEAM__-MMM`.

When work starts, the coordinator creates `type/__TEAM_SLUG__-NNN-slug` and sets the issue to In Progress. The coordinator sets In Review after the review gate and an open PR. Done is owner-accepted and merged to the default branch. Work with no Git artifact is a recorded exception. Subagents return lifecycle changes to the coordinator instead of applying them.

Failed CI, further edits, or owner rejection return the issue to In Progress. A regression after Done reopens to In Progress.

Do not use Testing or On Hold. Those states are archived. A `__TEAM__` blocker is a `Blocked by` relation, not a state.

The in-repo workflow rule is what agents execute. This skill is the Linear issue procedure. [docs/06-engineering.md](docs/06-engineering.md) is the working agreement. Do not create or update Linear documents. Do not read them as a source of truth.

## Find before create

`issue list` aliases `mine` and hides most work. Do not use it as inventory.

Search first:

```
linear issue query --team __TEAM__ --search <terms> --all-states --all-assignees
```

Do not pass `--workspace` when `LINEAR_API_KEY` is set. That flag fails the command. Workspace `funnysoft` comes from credentials.

Inspect candidates. Create only if none matches. If the CLI version changes, smoke-test this query before trusting empty results.

## Conventions

- Title: imperative and concrete.
- Description: outcome first, no file paths. Constraints, not implementation steps.
- Each product issue is one demoable vertical slice (schema + API + UI + tests when those layers exist). Harness, decision, research, and maintenance issues keep their existing shapes.
- Optional `Blocked by`.
- Acceptance criteria as checkboxes.
- Issue body holds parked options and the current lean.
- Comments hold owner leans and review notes.
- Git ADRs are Proposed in a PR. Owner approval authorizes an Accepted commit on that branch. Binding only after squash-merge to the default branch. Accepted on an open PR is not binding.
- Linear comments and Linear documents are not a source of truth.
- Link PRs and ADRs on the issue.
- Every PR references the issue identifier (`__TEAM__-nnn`) in its title or body.

## Labels

| Label           | Kind                  |
| --------------- | --------------------- |
| `area:backend`  | area                  |
| `area:frontend` | area                  |
| `area:mobile`   | area                  |
| `area:design`   | area                  |
| `area:infra`    | area                  |
| `area:harness`  | area                  |
| Bug             | type (workspace)      |
| Feature         | type (workspace)      |
| Improvement     | type (workspace)      |
| Maintenance     | type (team)           |
| Research        | type (team)           |
| decision        | ADR-tracked decisions |

## Projects

Create projects just in time, never upfront. Delivery phases live in [docs/02-scope.md](docs/02-scope.md). Current phase lives on the root `README.md`. Milestones mark phase gates within a project. Post a project status update when a milestone completes.

## Commands

```
linear issue query --team __TEAM__ --search <terms> --all-states --all-assignees
linear issue create --team __TEAM__ --title "Add conventional-commit hook" --label Feature --label area:harness
linear issue update __TEAM__-1 --state "In Progress"
linear issue relation add __TEAM__-170 blocked-by __TEAM__-176
linear project list --team __TEAM__
```

Do not run `linear document create` or `linear document update`.

## Project status updates

When a milestone completes, post a project status update on the current product project:

```
linear project-update create
```
