# Variant: Next-only

Marketing and sites. bun, oxc, shadcn, design loop, Lefthook, Linear, adversary. No Laravel tree.

Export variant: `next-only`. The JS app and its commands live at the repository root. Design assets live in `design`. PHP root, Artisan path, and Boost skills location are null in the export layout. Keep standalone Next data choices; do not generate a Laravel account system.

Playbook process in [engineering.md](../engineering.md) and [harness.md](../harness.md). Gates in [quality.md](../quality.md). Design loop in [design.md](../design.md).

## Stack

- bun
- oxc: `oxlint --deny-warnings` / oxfmt. No ESLint/Prettier.
- `tsc --noEmit`
- shadcn/ui plus shadcn registries. Tailwind via that setup. No parallel component kit.
- React Doctor zero warnings when the app uses React
- Vitest 100% line coverage of authored `lib/` (and workspace packages when they exist)

No PHP. No Horizon. No Boost. Stamp still copies the OpenCode tree, Lefthook, commit lint, and frontend gates that apply. The export omits PHP jobs, Composer packages, Boost commands, and Laravel-only rules. Copied playbook prose describes all stacks, but only this variant's executable assets apply.

## Design

`design` is the default home. Mock folder, 1440x900 / 390x844, Mobbin required, Open Design out. Same loop as every other variant.

## Process

One OpenCode tree. No symlinks. Linear CLI, not Linear MCP. Do not create or update Linear documents. Adversary on a recorded SHA before the PR. Squash merge. Owner merges.

## Deploy

Vercel unless a product ADR names another host. No Laravel Cloud.
