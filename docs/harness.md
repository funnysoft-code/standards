# Harness

T3 Code is the primary interface. Use its selected provider: Claude Code, Codex,
Cursor CLI, Grok Build, or OpenCode. Standalone provider CLIs use the same project
instructions. [ADR-0002](adr/0002-shared-provider-adapters.md) supersedes the
OpenCode-only policy.

## Canonical sources

| Artifact             | Path                                   | Ownership                                                   |
| -------------------- | -------------------------------------- | ----------------------------------------------------------- |
| Product instructions | `AGENTS.md`, nested scoped `AGENTS.md` | Product facts, pointers, and the shared reading instruction |
| Shared rules         | `.agents/rules/*.md`                   | Always-on constraints, with applicability in frontmatter    |
| Portable skills      | `.agents/skills/<name>/SKILL.md`       | On-demand procedures and their resources                    |
| Reviewer method      | `.agents/reviewers/adversary.md`       | Shared review method and verdict contract                   |
| MCP definitions      | `.agents/mcp.json`                     | Credential-free commands and remote URLs                    |
| Generator            | `scripts/provider-sync.mjs`            | Dependency-free Node.js 22+ adapter sync                    |
| Adapter receipt      | `.agents/provider-sync.json`           | Generated-file hashes, not a standards release receipt      |

Before work, read applicable `.agents/rules/*.md` and the pinned
`docs/playbook/README.md`. `AGENTS.md` says this explicitly. Frontmatter scope
must be honored when reading rules; a Laravel-only rule does not apply to a
Next-only task. Creative-mode remains a requestable skill.

Product facts and named deviations outrank accepted product decisions and design
authority, which outrank the pinned playbook, which outranks inferred code patterns.
Discover the smallest relevant set of docs, decisions, code, callers, and examples.
Personal global policy, providers, models, permissions, retries, and authentication
stay machine-local. Never copy `~/.agents/AGENTS.md` into products.

## Provider adapters

| Provider           | Instructions and skills                                                               | MCP                  | Reviewer                                                           |
| ------------------ | ------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------ |
| OpenCode V1 and V2 | `AGENTS.md`, `.agents/skills`                                                         | `opencode.json`      | `.opencode/agent/adversary.md`                                     |
| Codex              | `AGENTS.md`, `.agents/skills`                                                         | `.codex/config.toml` | Registered `[agents.adversary]` and `.codex/agents/adversary.toml` |
| Cursor CLI         | `AGENTS.md`, `.agents/skills`                                                         | `.cursor/mcp.json`   | `.cursor/agents/adversary.md`                                      |
| Claude Code        | Root and scoped `CLAUDE.md` import adjacent `@AGENTS.md`; real `.claude/skills` files | `.mcp.json`          | `.claude/agents/adversary.md`                                      |
| Grok Build         | `AGENTS.md`, real `.grok/skills` files                                                | `.grok/config.toml`  | Pass the canonical method to a supported native subagent           |

Generated skill resources retain their paths. Do not symlink native skill trees.
Reviewer adapters point at one canonical method and inherit the coordinator's
configured review route. They do not set a model or permission policy. If the
selected provider lacks a named role, pass the method to its native subagent tool.
If it cannot delegate, return the review requirement to the coordinator.

T3 currently runs OpenCode V1 `opencode` 1.18.30. Standalone V2 uses `opencode2`.
Project MCP uses the common V1 form `mcp.<name>` with `type: local`, command arrays,
or `type: remote` and a URL. Optional `enabled: false` disables a server. V2 accepts
V1 configuration through its compatibility path. Do not use V2-only
`mcp.servers` in a project shared with T3. V2 currently does not load `instructions`
entries; the explicit `AGENTS.md` reading instruction remains mandatory.

## Sync and migration

From an existing product, after the generator is installed:

```sh
node scripts/provider-sync.mjs
node scripts/provider-sync.mjs --check
```

For the first migration, run the standards copy from any directory:

```sh
node /path/to/standards/scripts/provider-sync.mjs --root /path/to/product --check
node /path/to/standards/scripts/provider-sync.mjs --root /path/to/product
node /path/to/product/scripts/provider-sync.mjs --root /path/to/product --check
```

If a `CLAUDE.md` path is also an application runtime prompt, preserve it explicitly:

```sh
node /path/to/standards/scripts/provider-sync.mjs --root /path/to/copperhead \
  --preserve-claude docs/BigQuery/CLAUDE.md
```

The receipt remembers this exception on later runs. The flag is repeatable;
supplying it again replaces the recorded exception list. A scoped `AGENTS.md`
can point at that runtime prompt instead of duplicating its content. Other existing
Claude files that are byte-identical to their adjacent `AGENTS.md`, or already
contain only `@AGENTS.md`, are safely adopted as generated bridges.

`--check` exits 1 for drift or conflicts and writes nothing. A clean check exits 0.
Sync installs its own portable script in the product. It promotes existing
`.opencode/rules` and `.opencode/skills`, then removes only the old files whose
contents were preserved. Conflicting canonical files stop the whole plan before
writes. Reruns keep authored canonical content. Root instruction updates replace
only legacy path references and the marked shared-instruction block. Nested
`AGENTS.md` files stay untouched and receive adjacent Claude bridges.

The first sync can import credential-free OpenCode MCP definitions. Its canonical
format is `{ "servers": { "tool": { "command": ["binary", "argument"] } } }`
or `{ "servers": { "tool": { "url": "https://example.test/mcp" } } }`.
Optional `enabled: false` omits a server from adapters lacking a common disabled
flag. No credentials, headers, environment values, or personal provider settings
are imported. Author a portable definition explicitly if an existing server uses
those fields. Authenticate each provider using its own local OAuth or credential
store. Local command arguments must also be credential-free.

Unrelated JSON settings and MCP names remain in their original provider file.
Same-name JSON MCP entries must match the previous generated entry or the desired
canonical definition. The receipt records entry hashes, not credential values.
An edited entry blocks updates and removal until its owner reconciles it.
TOML is preserved outside a marked generated block. Existing same-name TOML tables,
custom `CLAUDE.md` files, edited generated skills, and `opencode.jsonc` require
reconciliation before migration; the generator does not guess or erase them.
V2-only project fields such as `permissions` or `providers` also stop migration;
convert them to V1-compatible settings without copying personal configuration.
Move custom Claude instructions into the adjacent `AGENTS.md`, then remove the
redundant bridge file and rerun. Remove only reviewed redundant configuration.
Symlink sources or destinations fail explicitly. Materialize Boost skill links
with Boost sync first. The generator never reads global config or secret stores.

Do not blanket-restamp an existing product to migrate providers. Its scripts and
standards receipts stay unchanged under provider sync, apart from the installed
sync script. Upgrade the pinned playbook through the normal reviewed export
process. In particular, replace old OpenCode-only workflow language when adopting
ADR-0002; promoting a path alone does not repeal a product's old written policy.

## Export contract

All three export variants include canonical sources and native adapters. The
export stages provider sync before hashing assets. Generated files are covered by
the same digest verification as authored files. Apply preserves existing product
briefs, recalculates adapter hashes after team substitution, and records the exact
export identity in `STANDARDS_MANIFEST.json`. Applying an external release requires
its trusted expected digest. Existing provider configuration that cannot be
preserved safely blocks the whole apply before any file changes. Reconcile those
conflicts deliberately; deleting personal settings or a preserved runtime prompt
is not a migration step. Provider sync never changes
`STANDARDS_VERSION` or invents a published release. See [README.md](README.md).

## Laravel Boost

Boost is the Laravel agent layer. It lives beside `artisan`, at the repo root for
Inertia or `services/api` for API+Next. Next-only receives no Boost command,
package, sync script, PHP gate, or Laravel-only rule.

Keep `boost.json` committed, with all five agents: `claude_code`, `codex`, `cursor`,
`grok_build`, and `opencode`; retain `cloud: true`, `guidelines: true`, and
`funnysoft/boost-guidelines` in `packages`. Product Sail settings remain product
facts. Configure each provider in `config/boost.php` to write guidelines to the
app's `AGENTS.md` and skills to the repository's `.agents/skills`. For nested PHP
apps, resolve that root-relative destination from the app directory. The export's
`boostSkills` field still accepts app-local generation for older Boost versions;
the sync script collects both that location and root `.agents/skills`.

Boost may append its guidelines block to `AGENTS.md`; it must preserve the product
brief. Stamp path-copies `packages/boost-guidelines` beside the app's Composer
file. Keep its path repository and `funnysoft/boost-guidelines: @dev` requirement.

After `@php artisan boost:update --ansi`, Composer runs
`bash scripts/boost-sync-opencode-skills.sh` for Inertia, or
`bash ../../scripts/boost-sync-opencode-skills.sh` from `services/api` for API+Next.
The historical script name stays compatible with existing hooks. It materializes
and formats generated skills and Cloud `.ai/skills` into root `.agents/skills`,
with Cloud precedence, then runs provider sync. It uses the product's installed
oxfmt or vp formatter. Existing products must update the Boost output setting and
sync destination together. Preserve product-specific hooks while adding the
provider-sync tail. Do not rewrite Composer files wholesale.

Recent Boost versions can generate individual `.agents/skills/<name>` symlinks
to app-local `.ai/skills`. The Boost sync script dereferences these, including
nested resources, before invoking provider sync. Canonical skills must be real
files before calling the dependency-free provider generator directly; it rejects
symlinks rather than following an arbitrary source. Canonical changes from Boost
refresh unchanged generated adapters automatically. A hand-edited native adapter
still stops sync so its work can be reconciled.

Commit `.agents/boost-sync-receipt.json` alongside materialized skills. It records
which skill trees Boost owns and their SHA-256 hashes, not file contents or
credentials. Keep it across checkouts and refreshes so updates and removed skills
can be distinguished from custom procedures. Do not hand-edit its hashes or delete
it to bypass a collision.

For a legacy materialization without this receipt, regenerate the selected skill
as an internal Boost symlink, or compare the old copy with its generated source
and remove only the confirmed generated copy before rerunning Boost sync. Preserve
custom skills and edits separately, then reconcile them into their canonical
source. A failed refresh keeps its ownership evidence for retry; investigate a
reported edited destination rather than forcing a replacement.

## Rules and workflow

Rules are true whenever they apply. Skills are procedures. Hooks are hard gates.
Do not add a skill for a one-line reminder or a hook for a style lint already
covers. Compound Engineering remains the primary workflow suite.

The overlay remains caveman, ponytail, unslop, product, workflow, and design.
Skills include grilling, adr, retro, linear, design-mock, and frontend-ui. Review
still requires the adversary verdict on the recorded SHA.

Linear CLI, workspace `funnysoft`. Do not create or update Linear documents.
Product issues are vertical slices; maintenance and decision issues retain their
shape. A miss or owner correction runs retro on the same branch and PR. Do not
auto-run grilling; ask the owner to invoke it.

Laptop Laravel runs through Herd. Sail and Cursor Cloud remain out of scope
unless a product decision explicitly changes that. T3 owns worktrees and project
Actions; provider adapters must not add a competing lifecycle manager.
