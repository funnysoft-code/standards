# Harness

Cursor, Grok Build, Codex, and Claude are laptop process harnesses. Prefer whichever the human opened.

Laravel Boost is the Laravel agent layer, not the process harness.

## Four trees

Each harness owns a native tree. Bodies are copied. Do not symlink. `scripts/harness-parity.sh` fails if a name is missing or a symlink remains. It does not merge bodies.

| Tree | Role |
| --- | --- |
| `.cursor/` | Rules, skills, adversary agent, authored MCP |
| `.grok/` | Rules, skills, adversary, MCP toml |
| `.agents/` + `.codex/` | Codex rules/skills (Codex has no rules directory) and MCP |
| `.claude/` | Claude Code rules/skills. No root `CLAUDE.md`. |

Creative-mode is a requestable Cursor rule and a skill in the other trees. Grok would always-load it if it lived in `.grok/rules`.

## Boost vs process

Boost lives in the Laravel app tree. Repo root on an Inertia monolith (`__BOOST_ARTISAN__` = `artisan`). `services/api` on an API (`__BOOST_ARTISAN__` = `services/api/artisan`). Stamp replaces `__BOOST_ARTISAN__` in overlay files only.

Boost must not overwrite root `AGENTS.md`. Commit `boost.json` and generated Boost skills. `funnysoft/boost-guidelines` ships API lines and Inertia+React lines. Inertia lines render only when those packages are installed.

Authored MCP: `.cursor/mcp.json`, `.grok/config.toml`, `.codex/config.toml`. Boost + Mobbin. Do not set `cwd` in the Cursor file.

## Rule vs skill vs hook

Keep the harness thin.

- Rule: true whenever it applies. Always-on may have a session off-switch. Requestable starts on a phrase.
- Skill: a procedure.
- Hook: a hard block the agent cannot skip. Add one only when a rule keeps failing.

Do not add a skill for a one-line reminder. Do not add a hook for a style lint already covers. Do not add a rule that is true only inside one package.

Stack rules wait for their code. Do not copy personal Cursor rules unless they are true for every engineer.

## Always-on overlay

No off-switch except creative-mode:

- **caveman.** Chat voice. Full intensity.
- **ponytail.** Smallest change. YAGNI ladder. Bug fix is root cause.
- **unslop.** Persisted prose. No em dashes. No emoji.
- **product.** Craft over CRUD. Works-but-ugly is a fail. Quality zero-violation. Domain pointers.
- **workflow.** Linear-first, git, adversary, retro.
- **design.** Mock loop. DESIGN.md is SSOT.

Home BLUF loses inside a product repo that stamps caveman.

Skills: grilling, adr, retro, linear (team from product), design-mock, frontend-ui.
Agent: adversary.

## Linear

Linear CLI, not Linear MCP. Workspace `funnysoft`. Do not create or update Linear documents. Process and roadmap live in git. Parked options and the current lean live on the issue body.

Product issues are tracer-bullet vertical slices (schema + HTTP + UI + tests when those layers exist). Harness, decision, research, and maintenance keep their existing shapes.

## Retro and grilling

A miss or owner correction runs the retro skill. The smallest durable fix lands on the same branch and PR. Do not write a long postmortem. The harness change is the record. Comment the miss on the Linear issue.

Do not auto-run grilling. Pause and ask the owner to invoke it. Leave Plan mode off during a grill.

## Out of this playbook

Cursor Cloud and Sail are out. Laptop API is Herd. Do not add Dockerfile/Sail wrappers unless a later issue names Cloud Agents.
