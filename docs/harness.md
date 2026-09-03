# Harness

OpenCode is the only laptop process harness. Prefer it. Do not add Cursor, Grok Build, Codex, or Claude trees.

Laravel Boost is the Laravel agent layer, not the process harness.

## One tree

OpenCode owns the native tree. Bodies are copied. Do not symlink. `scripts/harness-parity.sh` fails if OpenCode artifacts are missing, a retired tree remains, or a symlink is used. It does not merge bodies.

| Artifact | Path | Job |
| --- | --- | --- |
| Always-on overlay | `.opencode/rules/*.md` via `opencode.json` `instructions` | Loaded every session |
| Skills | `.opencode/skills/<name>/SKILL.md` | On-demand procedures |
| Adversary | `.opencode/agent/adversary.md` | Subagent. Pin a model on dispatch |
| Commands | `.opencode/command/*.md` | Slash commands when a product adds them |
| MCP | `opencode.json` | Boost + Mobbin |
| Product brief | `AGENTS.md` | Short. Points at the playbook pin and product docs |

Creative-mode is a skill. Do not put it in `.opencode/rules` or OpenCode would always-load it.

There is no root `CLAUDE.md`.

## Boost vs process

Boost lives in the Laravel app tree. Repo root on an Inertia monolith (`__BOOST_ARTISAN__` = `artisan`). `services/api` on an API (`__BOOST_ARTISAN__` = `services/api/artisan`). Stamp replaces `__BOOST_ARTISAN__` in overlay files only.

Boost must not overwrite root `AGENTS.md`. It may append a `<laravel-boost-guidelines>` block. Commit `boost.json`. Generated Boost skills live under `.opencode/skills`. Point Boost there with `config/boost.php` `agents.opencode.skills_path`. Do not let Boost recreate `.agents/`.

`boost.json` must set `agents` to `["opencode"]`, `cloud` true, `guidelines` true, and `packages` must include `funnysoft/boost-guidelines`. Sail stays a product fact. peca-certa keeps `sail` false.

Stamp copies `packages/boost-guidelines`. The product Composer file path-requires it:

```json
{
  "repositories": [{ "type": "path", "url": "packages/boost-guidelines" }],
  "require-dev": { "funnysoft/boost-guidelines": "@dev" }
}
```

`funnysoft/boost-guidelines` ships API lines and Inertia+React lines. Inertia lines render only when those packages are installed.

After `boost:update`, run `scripts/boost-sync-opencode-skills.sh` so Cloud skills in `.ai/skills` become real files under `.opencode/skills`. Hook it from Composer `post-update-cmd`.

Authored MCP lives in `opencode.json`. Boost + Mobbin. Do not set a working directory on the Boost command; run it from the product root.

## Rule vs skill vs hook

Keep the harness thin.

- Rule: true whenever it applies. Always-on via `.opencode/rules`. Requestable starts on a phrase and lives as a skill.
- Skill: a procedure.
- Hook: a hard block the agent cannot skip. Add one only when a rule keeps failing.

Do not add a skill for a one-line reminder. Do not add a hook for a style lint already covers. Do not add a rule that is true only inside one package.

Stack rules wait for their code. Do not copy personal OpenCode config unless it is true for every engineer.

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

Do not auto-run grilling. Pause and ask the owner to invoke it. Do not switch to the plan agent during a grill.

## Out of this playbook

Cursor Cloud and Sail are out. Laptop API is Herd. Do not add Dockerfile/Sail wrappers unless a later issue names Cloud Agents. Do not restore a second process harness.
