# ADR-0002: Shared instructions and generated provider adapters

## Status

Accepted by the owner for F7T-173. Binding after merge to the default branch.
Supersedes [ADR-0001](0001-opencode-only-harness.md).

## Date

2026-09-10

## Owners

João Paulo Santos

## Context

T3 Code is the primary interface. Work can run through Claude Code, Codex, Cursor CLI, Grok Build, or OpenCode. T3 currently launches OpenCode V1, while standalone OpenCode V2 remains in use. A V2-only configuration and an OpenCode-only policy prevent the selected provider from finding the same project instructions and tools.

## Decision

Keep project entry instructions in `AGENTS.md`, shared rules in `.agents/rules`, portable skills in `.agents/skills`, reviewer methods in `.agents/reviewers`, and credential-free MCP definitions in `.agents/mcp.json`. Native provider files are generated from those sources. They are not separately maintained policy.

Use real Claude and Grok skill files, scoped Claude `@AGENTS.md` bridges, native reviewers where supported, and provider-specific MCP adapters. OpenCode uses the common V1 configuration shape that V2 accepts. The `AGENTS.md` reading instruction activates shared policy even when V2 does not load `instructions` entries.

The dependency-free sync generator detects drift, preserves product facts and unrelated provider settings, and rejects ambiguous or edited generated files before writing. Migration never assigns a release identity. Exported adapter bytes remain inside the verified standards export contract.

## Consequences

Boost writes shared skills and refreshes adapters after updates. Product teams edit one canonical source and commit regenerated files. Provider authentication, personal model routes, permissions, and global policy remain machine-local. T3 owns worktree lifecycle; provider compatibility does not create a second lifecycle manager.

Rejected: maintaining five independent copies of policy, symlinking native skill trees, forcing one provider, or copying global configuration into each repository.

## Links

- [F7T-173](https://linear.app/funnysoft/issue/F7T-173)
- [Harness contract](../harness.md)
