---
name: adr
description: Write an architecture decision record when a choice is irreversible, cross-cutting, or the owner flags it.
---

# ADR

## When required

Write an ADR when any of these hold:

- The choice is irreversible, or expensive to reverse.
- The choice is cross-cutting across modules or apps.
- The owner asked for one.
- An open decision listed in the pillar docs gets resolved.

## Procedure

1. Copy `docs/adr/0000-template.md` to the next 4-digit number plus a kebab-case slug.
2. Fill Context, Decision, and Consequences.
3. Link the __TEAM__ issue labeled `decision`.
4. Update the index in `docs/adr/README.md`.
5. Propose via PR with Status Proposed. Owner approval authorizes one Accepted commit on that branch, then squash-merge. Binding only after squash-merge to the default branch. Accepted on an open PR is not binding. Definitive pillar sentences travel in the same PR.

## Rules

Status and the index row are metadata. They may move Proposed to Accepted to Superseded. After Accepted, Decision and Consequences stay immutable. Rotting facts (model names, prices, package versions) may be patched and dated. A change to the choice itself still supersedes.

New ADRs list rejected alternatives in Git. Linear issues may still hold parked options while the decision is open.

Keep them short. A reader decides in two minutes whether it affects them.
