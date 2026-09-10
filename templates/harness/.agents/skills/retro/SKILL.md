---
name: retro
description: Capture a harness lesson after a miss or owner correction, patch the harness on the same branch as the work.
---

# Retro

## Triggers

- The owner corrects the agent.
- A defect ships that a gate should have caught.
- An agent repeats a known mistake.
- A gate produces a false positive.

## Procedure

1. Name the miss in one sentence.
2. Classify the smallest durable fix:
   - Always-true constraint: edit a rule.
   - Procedure: edit a skill.
   - Hard block: add or edit a hook.
   - Missing knowledge: edit a pillar doc.
3. Prefer editing an existing artifact over creating a new one.
4. Land the harness patch on the same branch as the work that exposed the gap, and in the same PR.

## Log

Comment the miss on the work issue: what missed, what changed. Create a new `area:harness` issue only when the miss is not already attached to an open change.

## Guardrails

- Do not add a rule for something that happened once and is unlikely to repeat.
- Keep an artifact to one job. Split it when a second job creeps in.
- Review the harness for dead weight when a milestone completes.
