# Architecture Decision Records

Playbook ADRs live here. Product ADRs live in the product repo.

Write an ADR when the choice is irreversible, cross-cutting, the owner asked, or an open pillar decision is resolved.

An open decision in a pillar is not an ADR until someone writes one. Do not treat a pillar sentence as an ADR.

Keep them short. A reader decides in two minutes whether it affects them.

## Index

| Number | Title | Status | Date |
| --- | --- | --- | --- |
| | None yet. | | |

Status values: Proposed, Accepted, Superseded.

## How to add one

1. Copy [0000-template.md](0000-template.md).
2. Use the next number and a short kebab title.
3. Set status to Proposed. Open a pull request. Point at the Linear issue.
4. Owner approval authorizes one Accepted commit on that branch, then squash-merge. Binding only after squash-merge to the default branch. Accepted on an open PR is not binding.

Status and the index row are metadata. After Accepted, Decision and Consequences stay immutable. Rotting facts may be patched and dated. A change to the choice itself supersedes. The new ADR names the one it replaces.

New ADRs list rejected alternatives in git. One ADR issue, one PR.
