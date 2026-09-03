# Variant: Next-only

Marketing and sites. bun, oxc, shadcn, design loop, Lefthook, Linear, adversary. No Laravel tree.

Playbook process in [engineering.md](../engineering.md) and [harness.md](../harness.md). Gates in [quality.md](../quality.md). Design loop in [design.md](../design.md).

## Stack

- bun
- oxc: `oxlint --deny-warnings` / oxfmt. No ESLint/Prettier.
- `tsc --noEmit`
- shadcn/ui plus shadcn registries. Tailwind via that setup. No parallel component kit.
- React Doctor zero warnings when the app uses React
- Vitest 100% line coverage of authored `lib/` (and workspace packages when they exist)

No PHP. No Horizon. No Boost. No `__BOOST_ARTISAN__`. Stamp still copies the OpenCode tree, Lefthook, commit lint, and frontend gates that apply.

## Design

`__DESIGN_ROOT__` = `design` unless the product names another root. Mock folder, 1440x900 / 390x844, Mobbin required, Open Design out. Same loop as every other variant.

## Process

One OpenCode tree. No symlinks. Linear CLI, not Linear MCP. Do not create or update Linear documents. Adversary on a recorded SHA before the PR. Squash merge. Owner merges.

## Deploy

Vercel unless a product ADR names another host. No Laravel Cloud.
