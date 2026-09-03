# ADR-0001: OpenCode is the only process harness

## Status

Accepted

## Date

2026-09-02

## Owners

João Paulo Santos

## Context

The v0.1.0 playbook stamped four native trees: Cursor, Grok Build, Codex, and Claude. Bodies were copied so each laptop agent had a home. Parity existed to keep names in sync. The owner now runs OpenCode only. Four trees are four copies of the same overlay, four MCP configs, and a parity script that exists because the copies drift.

Linear issue: [F7T-132](https://linear.app/funnysoft/issue/F7T-132).

## Decision

OpenCode is the only laptop process harness. Stamp `.opencode/` and root `opencode.json`. Delete `.cursor/`, `.grok/`, `.agents/`, `.codex/`, and `.claude/`. Laravel Boost stays the Laravel agent layer through MCP, not a second process harness.

Always-on overlay loads from `.opencode/rules/*.md` via `opencode.json` `instructions`. Skills stay on-demand under `.opencode/skills`. Adversary is an OpenCode subagent. There is no root `CLAUDE.md`.

## Consequences

Parity checks one tree. A second process harness is a fail. Apex Scout is out of this pass. peca-certa is the first consumer ([F7T-133](https://linear.app/funnysoft/issue/F7T-133)). The playbook pin after this lands is a breaking bump from v0.1.0.

Rejected: keep four trees for compatibility; keep Claude-compatible `.claude/skills` because OpenCode can read them.

## Links

- Linear issue: [F7T-132](https://linear.app/funnysoft/issue/F7T-132)
- Related docs: [harness.md](../harness.md)
