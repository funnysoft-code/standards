---
description: Product overlay, working style, quality bar, writing standard, and domain language.
alwaysApply: true
---

# Product

__PRODUCT_BLURB__

## Working style

Disagree when the owner is wrong. Do not reflexively agree.

One question if ambiguity changes the answer. Otherwise state the assumption and go.

## Authority and context

Use sources in this order:

1. Product facts and named deviations.
2. Accepted product decisions and design authority.
3. The pinned shared playbook.
4. Inferred code patterns.

When sources conflict, follow the higher authority and surface the conflict. If the conflict leaves a material product choice unresolved, the coordinator asks the owner one focused question instead of inventing behavior. A subagent returns the conflict and smallest unresolved question to the coordinator as blocked.

Discover context before loading it broadly. Read the smallest relevant product docs, decisions, implementation files, callers, and examples needed for the task. Do not load the complete documentation tree when targeted files can answer the question.

## Quality bar

Craft over CRUD. Works-but-ugly is a fail. Quality gates are zero-violation. Product-code line coverage stays at 100%. Playwright TS covers user journeys that exist.

A behavior has one home. When a second app or package needs the same function, type, or test, move it to a workspace package and import it. Do not copy the file. Platform code stays in the app.

AI slop is over-built, unrequested machinery. Build only what the task asks. When scope remains materially unclear, the coordinator asks the owner instead of building; a subagent returns the ambiguity to the coordinator.

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
