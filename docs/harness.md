# Harness

OpenCode V2 is the laptop process harness. Do not add Cursor, Grok Build, Codex, or Claude trees.

Laravel Boost is the Laravel agent layer, not the process harness.

## One tree

OpenCode owns `.opencode/` and `opencode.json`. Do not add a second process harness.

| Artifact       | Path                               | Job                                                                  |
| -------------- | ---------------------------------- | -------------------------------------------------------------------- |
| Shared overlay | `.opencode/rules/*.md`             | Read on entry as directed by the short `AGENTS.md`                   |
| Skills         | `.opencode/skills/<name>/SKILL.md` | On-demand procedures                                                 |
| Adversary      | `.opencode/agent/adversary.md`     | Subagent. Uses the coordinator environment's configured review route |
| Commands       | `.opencode/command/*.md`           | Slash commands when a product adds them                              |
| MCP            | `opencode.json` `mcp.servers`      | Boost + Mobbin for Laravel; Mobbin for Next-only                     |
| Product brief  | `AGENTS.md`                        | Short. Points at the playbook pin and product docs                   |

Creative-mode is a skill. Do not put it in `.opencode/rules` or OpenCode would always-load it.

There is no root `CLAUDE.md`.

OpenCode V2 currently accepts `instructions` but does not load those entries.
Keep the field for compatibility, but do not rely on it to activate policy.
The generator-owned short `AGENTS.md` must say: "Before work, read the applicable
`.opencode/rules/*.md` files and the pinned `docs/playbook/README.md`."
Stamp never replaces that product brief. V2 MCP servers connect by default;
use `disabled: true` only to disable one. There is no V2 `enabled` field.

## Shared and machine-local layers

The stamped harness owns portable product and team behavior. Product facts and named deviations outrank accepted product decisions and design authority, which outrank the pinned shared playbook, which outranks inferred code patterns. Agents discover the smallest relevant set of docs, decisions, implementation files, callers, and examples before loading broader context.

Personal orchestration stays in global OpenCode configuration. The coordinator, context scout, research specialist, implementation worker, provider choices, model effort, and retry policy are machine-local. They are not stamped into products. Products use their pinned playbook instead of a live global reference to this checkout.

Compound Engineering remains the primary workflow suite. Machine-local roles route bounded work into that workflow; they do not duplicate its planning, implementation, review, or shipping procedures. The project adversary remains shared because its review method and quality gate are team behavior, while its model and permission ceiling remain personal configuration.

## Boost vs process

Boost lives in the Laravel app tree. Repo root on an Inertia monolith, with `artisan`. API + Next uses `services/api`, with `services/api/artisan`. The export resolves layout placeholders only in explicitly declared text assets. Next-only receives no Boost MCP command, package, sync script, PHP gate, or Laravel-only rule.

Boost must not overwrite root `AGENTS.md`. It may append a `<laravel-boost-guidelines>` block. Commit `boost.json`. Generated Boost skills live under `.opencode/skills`. Point Boost there with `config/boost.php` `agents.opencode.skills_path`. Do not let Boost recreate `.agents/`.

`boost.json` must set `agents` to `["opencode"]`, `cloud` true, `guidelines` true, and `packages` must include `funnysoft/boost-guidelines`. Sail stays a product fact. peca-certa keeps `sail` false.

Stamp copies `packages/boost-guidelines` relative to the PHP app root. In API + Next this is `services/api/packages/boost-guidelines`. The PHP app's Composer file path-requires it:

```json
{
  "repositories": [{ "type": "path", "url": "packages/boost-guidelines" }],
  "require-dev": { "funnysoft/boost-guidelines": "@dev" }
}
```

`funnysoft/boost-guidelines` ships API lines and Inertia+React lines. Inertia lines render only when those packages are installed.

After `boost:update`, run `scripts/boost-sync-opencode-skills.sh` so app-local
generated skills and Cloud skills in the PHP app's `.ai/skills` become real
files under the repository root `.opencode/skills`. The export's `boostSkills`
layout field retains the app-local Boost output path; the sync destination is
always the repository root. Cloud copies take precedence over generated links
with the same name. The bundled `funnysoft-quality` skill is also stamped as a
real root file and shipped in the Boost guidelines package.

Hook sync from Composer `post-update-cmd`, after `@php artisan boost:update --ansi`.
Inertia uses `bash scripts/boost-sync-opencode-skills.sh`. API+Next uses
`bash ../../scripts/boost-sync-opencode-skills.sh` from `services/api`.

Authored MCP lives in `opencode.json`. Boost + Mobbin. Do not set a working directory on the Boost command; run it from the product root.

## Rule vs skill vs hook

The versioned export contract is documented in [README.md](README.md). Both direct stamping and the generator apply the same export. Applicable OpenCode files are mandatory, copied as real files, with no personal providers, models, permissions, or global configuration symlinks. Shared playbook documents live in `docs/playbook/` in the generated product.

Layout metadata names the PHP app root, JS roots, design home, Artisan path, and Boost skills destination for each stack. API + Next keeps JS applications and packages at `apps/web`, `packages/api-client`, and `packages/design-system`, while Laravel assets live under `services/api`. Commands must use the owning app root. The schema supports additional named asset sets for Boost skills, guidelines, stack gates, and OpenCode runtime configuration.

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
