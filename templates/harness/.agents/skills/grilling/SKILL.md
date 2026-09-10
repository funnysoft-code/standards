---
name: grilling
description: Interview the owner about a loose idea before a plan. Use when the owner says grill, or wants to stress-test an idea before building.
disable-model-invocation: true
---

# Grilling

Interview the owner relentlessly about every aspect of this idea until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

This skill is user-invoked. If the owner has not asked to grill, do not start. Pause and ask them to invoke it.

Ask the questions one at a time, waiting for feedback on each question before continuing. Asking multiple questions at once is bewildering.

Ask each question using the selected provider's question tool when available, or plain prose when it has none. Make your recommended answer the first option and append " (Recommended)" to its label. Allow a free-form answer.

If a question can be answered by exploring the codebase, explore the codebase instead.

Leave Plan mode off. Grill is inquiry. Plan mode rushes a plan.

Do not write CONTEXT.md. Do not write an ADR during the grill. Before the first parked option, find or create the Backlog issue. Park options and the current lean on that issue body. Move the issue to Todo when the design is ready. Pillar sentences and git ADRs wait until the owner accepts the lean.

When in doubt about scope, ask the owner. Domain words stay as written in the product docs.
