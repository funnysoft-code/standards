---
description: Product overlay, working style, quality bar, writing standard, and domain language.
---

# Product

__PRODUCT_BLURB__

## Working style

Disagree when the owner is wrong. Do not reflexively agree.

One question if ambiguity changes the answer. Otherwise state the assumption and go.

## Quality bar

Craft over CRUD. Works-but-ugly is a fail. Quality gates are zero-violation. Product-code line coverage stays at 100%. Playwright TS covers user journeys that exist.

A behavior has one home. When a second app or package needs the same function, type, or test, move it to a workspace package and import it. Do not copy the file. Platform code stays in the app.

AI slop is over-built, unrequested machinery. Build only what the task asks. When in doubt about scope, ask the owner instead of building.

Screens follow the design rule.

## Writing standard

Human-readable prose and code. Comments only for non-obvious intent. Unslop covers AI tells in persisted writing.

## Domain language

Use product domain terms as written in the product docs. Do not invent synonyms.

## Pointers

- Product: `docs/01-vision.md`
- Stack conventions: `docs/04-backend.md`, `docs/05-frontend.md`
- Decisions: `docs/adr/`

When a decision is architectural or irreversible, use the `adr` skill. Do not decide inline.
