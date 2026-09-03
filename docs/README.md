# FunnySoft engineering playbook

This directory is the source of truth for process, quality, harness, design, and stack variants. Products pin a git tag (`STANDARDS_VERSION`). Stamp copies harness trees, shared scripts, Lefthook, and playbook-required docs. Product vision and named deviations stay in the product repo.

English for playbook, ADRs, templates, and commit messages. Product UI locale is product.

## Three layers

1. **Playbook** (this repo). True for every FunnySoft Laravel + React product.
2. **Stack variant.** Inertia monolith, API+Next, or Next-only. Backend layout, HTTP contract, deploy defaults.
3. **Product repo.** Vision, domain language, named deviations.

AGENTS.md in a product is short. It points at the playbook pin, the variant doc, and the product pillars.

## Index

| Doc | Purpose |
| --- | --- |
| [engineering.md](engineering.md) | Nets, git, review, adversary, PHP conventions, definition of done |
| [harness.md](harness.md) | OpenCode tree, Boost vs process, parity, overlay, retro |
| [design.md](design.md) | Visual loop, mock store, screenshots |
| [quality.md](quality.md) | Named gates and product-code include lists |
| [variants/inertia-monolith.md](variants/inertia-monolith.md) | Laravel + Inertia + React |
| [variants/api-next.md](variants/api-next.md) | Laravel API + Next (and Expo when a store app exists) |
| [variants/next-only.md](variants/next-only.md) | Marketing and sites. No Laravel. |
| [adr/](adr/README.md) | Playbook Architecture Decision Records |

## Reading order

1. [engineering.md](engineering.md)
2. [harness.md](harness.md)
3. [design.md](design.md)
4. [quality.md](quality.md)
5. The variant for the product you are in
6. [adr/](adr/README.md) when a decision affects your work

## Consumption

Stamp copies these files into a product as `docs/playbook/` (or the product reads them via the pin). Products do not get vision docs from here.

Linear via the Linear CLI is the issue SSOT. Workspace `funnysoft`. Do not create or update Linear documents. Process and roadmap live in git. Parked options and the current lean live on the issue body.
