# FunnySoft standards repo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a stampable `funnysoft-code/standards` repo at tag `v0.1.0` that copies playbook docs and four native harness trees into a product.

**Architecture:** Docs + templates + `scripts/stamp.sh`. Templates are real files (no symlinks). Stamp replaces `__TEAM__`, `__PRODUCT__`, `__BOOST_ARTISAN__` in overlay files only. `scripts/harness-parity.sh` checks template names. A bash test drives stamp into a temp dir.

**Tech Stack:** git, bash, bun not required. Source copies from `~/Code/apex-scout/apex-scout-v2`.

**Spec:** `docs/superpowers/specs/2026-09-02-engineering-playbook-design.md`
**Issue:** [F7T-127](https://linear.app/funnysoft/issue/F7T-127/author-funnysoft-standards-repo-and-stamp-script)
**Parent:** [F7T-126](https://linear.app/funnysoft/issue/F7T-126)

## Global Constraints

- English playbook. No em dashes. No emoji.
- Four harnesses: Cursor, Grok, Codex, Claude. Copy bodies. No symlinks.
- Linear team placeholder `__TEAM__` (peca-certa will stamp `F7T`).
- Boost artisan placeholder `__BOOST_ARTISAN__` (monolith: `artisan`; API: `services/api/artisan`).
- Design mock path placeholder `__DESIGN_ROOT__` (`design` vs `packages/design-system`).
- Horizon is the playbook queue runner. Do not copy Apex "Do not install Horizon".
- Action classes use `*Action` suffix.
- PHPStan max, no bleedingEdge.
- Do not stamp Apex Scout v2.
- Conventional Commits. Branch `harness/f7t-127-standards-repo` when work starts.
- Caveman/ponytail/unslop/design/workflow/product overlay. Creative-mode is a Cursor rule and a skill elsewhere.

## File map

```
README.md
STANDARDS_VERSION          (tag name the stamp records in products)
docs/README.md
docs/engineering.md
docs/harness.md
docs/design.md
docs/quality.md
docs/variants/inertia-monolith.md
docs/variants/api-next.md
docs/variants/next-only.md
docs/adr/0000-template.md
docs/adr/README.md
packages/boost-guidelines/composer.json
packages/boost-guidelines/resources/boost/guidelines/core.blade.php
templates/harness/.cursor/rules/*.mdc
templates/harness/.cursor/skills/{adr,design-mock,frontend-ui,grilling,linear,retro,creative-mode}/SKILL.md
templates/harness/.cursor/agents/adversary.md
templates/harness/.cursor/mcp.json
templates/harness/.grok/rules/*.md
templates/harness/.grok/skills/...
templates/harness/.grok/agents/adversary.md
templates/harness/.grok/config.toml
templates/harness/.agents/rules/*.md
templates/harness/.agents/skills/...
templates/harness/.codex/config.toml
templates/harness/.claude/rules/*.md
templates/harness/.claude/skills/...
templates/harness/.claude/agents/adversary.md
templates/scripts/harness-parity.sh
templates/scripts/lint-commit-msg.sh
templates/scripts/php-gate.sh
templates/scripts/frontend-gate.sh
templates/scripts/screenshot.sh
templates/lefthook.yml
templates/github/workflows/quality.yml
scripts/stamp.sh
scripts/harness-parity.sh
tests/stamp_test.sh
```

Copy sources (read, then strip Apex-only nouns):

- Rules/skills/adversary: `~/Code/apex-scout/apex-scout-v2/.cursor/`
- Grok/Codex trees: same repo `.grok/`, `.agents/`, `.codex/`
- `lint-commit-msg.sh`, `screenshot.sh`, `screenshot.mjs`: Apex `scripts/`
- Boost guidelines: Apex `packages/boost-guidelines/`

---

### Task 1: Branch and GitHub remote

**Files:**
- Modify: nothing in-tree yet
- Create: git remote after `gh repo create`

**Interfaces:**
- Consumes: local repo `~/Code/funnysoft/standards` (already has spec + README)
- Produces: branch `harness/f7t-127-standards-repo`; remote `origin` → `funnysoft-code/standards`

- [ ] **Step 1: Set Linear In Progress and create the branch**

```bash
linear issue update F7T-127 --state "In Progress"
cd ~/Code/funnysoft/standards
git checkout -b harness/f7t-127-standards-repo
```

Expected: branch exists. Do not run `linear issue start`.

- [ ] **Step 2: Create the GitHub repo and push**

```bash
cd ~/Code/funnysoft/standards
gh repo create funnysoft-code/standards --private --source=. --remote=origin --push
```

If `gh` cannot create under `funnysoft-code`, stop and ask the owner. Do not create under `jonaspauleta`.

- [ ] **Step 3: Commit nothing extra**

Remote push of current main/spec is enough. Later tasks commit on `harness/f7t-127-standards-repo`.

```bash
git push -u origin harness/f7t-127-standards-repo
```

---

### Task 2: Playbook docs

**Files:**
- Create: `docs/README.md`, `docs/engineering.md`, `docs/harness.md`, `docs/design.md`, `docs/quality.md`, `docs/variants/inertia-monolith.md`, `docs/variants/api-next.md`, `docs/variants/next-only.md`, `docs/adr/0000-template.md`, `docs/adr/README.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: spec sections Playbook, Variants
- Produces: SSOT markdown the stamp copies into `docs/playbook/` or products read via pin. Products do not get vision docs from here.

Write the docs from the spec. Do not paste Apex `docs/01-vision.md`. Do not mention track days.

- [ ] **Step 1: Write `docs/adr/0000-template.md`**

Copy Apex `docs/adr/0000-template.md` unchanged except drop A7T wording: "Link the Linear issue" not "Link the A7T issue".

- [ ] **Step 2: Write `docs/engineering.md`**

Must include: two nets (Lefthook = CI), Conventional Commits allowlist, branch `type/{team}-{NNN}-slug`, adversary pins table (Cursor/Grok/Codex/Claude), squash merge, owner merge, 100% product-code line coverage, 100% type-coverage, PHPStan max no bleedingEdge, React Doctor zero warnings, Horizon, Redis session/cache/locks/limits/queues, throttle every product route, `*Action` suffix, no BaseAction, no repo interfaces.

- [ ] **Step 3: Write `docs/harness.md`**

Must include: four trees, no symlinks, parity checks names, Boost vs process, `__BOOST_ARTISAN__`, creative-mode as skill outside Cursor, no Cursor Cloud, no Sail, rule/skill/hook, retro, grilling not auto, Linear CLI not MCP, no Linear documents.

- [ ] **Step 4: Write `docs/design.md`**

Must include: `__DESIGN_ROOT__/DESIGN.md`, mock folder shape, 1440x900 / 390x844, Mobbin required, Open Design out, shadcn only, theme silent.

- [ ] **Step 5: Write `docs/quality.md`**

Named gates and include lists per variant. oxc: `vp lint` on Vite, `oxlint --deny-warnings` on Next. Pest via `vendor/bin/pest` not artisan test.

- [ ] **Step 6: Write the three variant files**

`inertia-monolith.md`: Request → Data → Action → repository → Inertia. camelCase props. Wayfinder. UUID PK allowed. Services adapters. `tests/Http/{Noun}`. `resources/js/pages` kebab-case. `resources/js/lib` Vitest 100%. Playwright TS. Passkeys stay.

`api-next.md`: nwidart, uuid column not HasUuids, JsonResource, OpenAPI, snake_case, Vercel, Horizon playbook default (Apex Cloud queues are a product deviation).

`next-only.md`: no Laravel. bun, oxc, shadcn, design loop.

- [ ] **Step 7: Point README at the docs**

Replace the "design spec under review" sentence with: playbook is the SSOT; spec remains history.

- [ ] **Step 8: Commit**

```bash
git add docs README.md
git commit -m "docs: add playbook pillars and stack variants"
```

---

### Task 3: Shared scripts and leftover templates

**Files:**
- Create: `scripts/lint-commit-msg.sh` (also copied to `templates/scripts/`)
- Create: `templates/scripts/screenshot.sh` + `screenshot.mjs` from Apex
- Create: `templates/lefthook.yml`
- Create: `templates/github/workflows/quality.yml`

**Interfaces:**
- Consumes: Apex `scripts/lint-commit-msg.sh` (allowlist already matches)
- Produces: scripts stamp will copy into products

- [ ] **Step 1: Copy lint-commit-msg.sh**

```bash
cp ~/Code/apex-scout/apex-scout-v2/scripts/lint-commit-msg.sh \
  ~/Code/funnysoft/standards/scripts/lint-commit-msg.sh
chmod +x ~/Code/funnysoft/standards/scripts/lint-commit-msg.sh
cp ~/Code/funnysoft/standards/scripts/lint-commit-msg.sh \
  ~/Code/funnysoft/standards/templates/scripts/lint-commit-msg.sh
```

- [ ] **Step 2: Prove the allowlist**

```bash
cd ~/Code/funnysoft/standards
scripts/lint-commit-msg.sh "feat: add stamp script"
scripts/lint-commit-msg.sh "bad message"; echo exit:$?
```

Expected: first exit 0. Second exit 1.

- [ ] **Step 3: Copy screenshot scripts from Apex `scripts/screenshot.sh` and `screenshot.mjs` into `templates/scripts/`.** Keep 1440x900 default and 390x844 phone.

- [ ] **Step 4: Write `templates/lefthook.yml`**

```yaml
commit-msg:
  jobs:
    - name: conventional-commit
      run: scripts/lint-commit-msg.sh --file {1}

pre-commit:
  parallel: true
  jobs:
    - name: harness-parity
      glob:
        - ".cursor/**"
        - ".grok/**"
        - ".codex/**"
        - ".agents/**"
        - ".claude/**"
        - "AGENTS.md"
        - "boost.json"
        - "scripts/harness-parity.sh"
        - "lefthook.yml"
      run: scripts/harness-parity.sh
    - name: php
      glob: ["app/**", "tests/**", "routes/**", "config/**", "database/**", "scripts/php-gate.sh"]
      run: scripts/php-gate.sh all
    - name: frontend
      glob: ["resources/js/**", "resources/css/**", "package.json", "bun.lock", "scripts/frontend-gate.sh"]
      run: scripts/frontend-gate.sh lint && scripts/frontend-gate.sh typecheck && scripts/frontend-gate.sh test && scripts/frontend-gate.sh doctor
```

Playwright is not in Lefthook.

- [ ] **Step 5: Write `templates/github/workflows/quality.yml`**

Blacksmith ARM. `on: pull_request` plus `workflow_call`. Jobs: commit-lint (PR title + messages), harness-parity, php-gate matrix `pint|phpstan|rector|pest`, frontend-gate matrix `lint|typecheck|test|doctor`. Pin `actions/checkout` SHA. No deploy job in this template (product deploy.yml / main job is peca-certa issue F7T-128).

- [ ] **Step 6: Commit**

```bash
git add scripts/lint-commit-msg.sh templates
git commit -m "chore: add commit lint, Lefthook, and quality workflow templates"
```

---

### Task 4: Harness templates (strip Apex, add Claude)

**Files:**
- Create: everything under `templates/harness/`

**Interfaces:**
- Consumes: Apex `.cursor`, `.grok`, `.agents`, `.codex`
- Produces: overlay files using `__TEAM__`, `__PRODUCT__`, `__BOOST_ARTISAN__`, `__DESIGN_ROOT__`

- [ ] **Step 1: Copy Cursor rules and skills**

```bash
SRC=~/Code/apex-scout/apex-scout-v2
DST=~/Code/funnysoft/standards/templates/harness
mkdir -p "$DST/.cursor/rules" "$DST/.cursor/skills" "$DST/.cursor/agents"
cp "$SRC/.cursor/rules/"*.mdc "$DST/.cursor/rules/"
cp -R "$SRC/.cursor/skills/"* "$DST/.cursor/skills/"
cp "$SRC/.cursor/agents/adversary.md" "$DST/.cursor/agents/adversary.md"
```

- [ ] **Step 2: Copy creative-mode Cursor rule to a skill for Grok/Codex/Claude**

Keep `.cursor/rules/creative-mode.mdc`. Also write `templates/harness/.cursor/skills/creative-mode/SKILL.md` with the same body (Grok/Codex/Claude load it as a skill). Copy that skill into `.grok/skills/creative-mode`, `.agents/skills/creative-mode`, `.claude/skills/creative-mode`.

- [ ] **Step 3: Replace Apex-only strings in product.mdc, workflow.mdc, linear/SKILL.md, design.mdc, design-mock, frontend-ui, laravel-api.mdc**

Required replacements:

| Find | Replace |
| --- | --- |
| `A7T` | `__TEAM__` |
| `a7t-NNN` | `__TEAM_SLUG__-NNN` (stamp sets `__TEAM_SLUG__` to lowercased team, `f7t`) |
| `Apex Scout` / `Scout aggregates` | `__PRODUCT__` one-liner from product overlay (stamp reads `overlays/product.md` if present; template product.mdc uses `__PRODUCT_BLURB__`) |
| `packages/design-system` | `__DESIGN_ROOT__` |
| `services/api/artisan` | `__BOOST_ARTISAN__` |
| `Do not install Horizon` | delete. Playbook uses Horizon |
| `tests/workflows.yml` Maestro | Inertia products: Playwright only. Keep Maestro sentence only in `docs/variants/api-next.md`, not in always-on product.mdc |

`laravel-api.mdc` globs: `__LARAVEL_GLOBS__` default `app/**`, `routes/**`, `config/**`, `database/**`, `tests/**`.

- [ ] **Step 4: Write MCP configs**

`.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "laravel-boost": {
      "command": "php",
      "args": ["${workspaceFolder}/__BOOST_ARTISAN__", "boost:mcp"]
    },
    "mobbin": {
      "url": "https://api.mobbin.com/mcp"
    }
  }
}
```

Do not set `cwd`. Mirror in `.grok/config.toml` and `.codex/config.toml` (`npx mcp-remote` for Mobbin on Codex, same as Apex).

- [ ] **Step 5: Copy Grok and Codex trees from Apex, then apply the same replacements. Confirm no symlinks:**

```bash
find templates/harness -type l
```

Expected: empty.

- [ ] **Step 6: Build Claude tree from Cursor bodies**

```
templates/harness/.claude/rules/{caveman,ponytail,unslop,product,workflow,design,laravel-api}.md
templates/harness/.claude/skills/*  (same skills as Cursor, plus creative-mode)
templates/harness/.claude/agents/adversary.md
```

Adversary Claude pin: default high, max extra-high, same Critical/High/Medium bar. Name models in the file as `claude-opus-4-6` default and extra-high for max if the harness accepts those slugs. If the Claude harness only honors frontmatter `model`, set it and document the max override in the body.

No `CLAUDE.md`.

- [ ] **Step 7: Commit**

```bash
git add templates/harness
git commit -m "chore: add four-harness templates with team placeholders"
```

---

### Task 5: Boost guidelines package

**Files:**
- Create: `packages/boost-guidelines/**`

**Interfaces:**
- Consumes: Apex package
- Produces: same composer name `funnysoft/boost-guidelines`

- [ ] **Step 1: Copy the package**

```bash
cp -R ~/Code/apex-scout/apex-scout-v2/packages/boost-guidelines \
  ~/Code/funnysoft/standards/packages/boost-guidelines
```

Do not delete the Apex copy.

- [ ] **Step 2: Edit Inertia lines in `core.blade.php`**

Change `resources/js/Pages` to `resources/js/pages`. Add: write path Form Request → Data → Action → repository → Inertia. `*Action` suffix. Do not mention JsonResource in the Inertia block.

Keep the API block (modules, `/api`, snake_case) behind the existing `@if` so JSON APIs do not get Inertia rules.

- [ ] **Step 3: Commit**

```bash
git add packages/boost-guidelines
git commit -m "chore: vendor FunnySoft Boost guidelines into standards"
```

---

### Task 6: stamp.sh (test first)

**Files:**
- Create: `tests/stamp_test.sh`
- Create: `scripts/stamp.sh`
- Create: `scripts/harness-parity.sh` (repo copy that checks `templates/harness`)
- Create: `templates/scripts/harness-parity.sh` (product copy that checks stamped trees)
- Create: `templates/scripts/php-gate.sh`
- Create: `templates/scripts/frontend-gate.sh`

**Interfaces:**
- Consumes: `templates/`
- Produces: `stamp.sh TARGET` copies files; writes `STANDARDS_VERSION` in the target; does not overwrite `overlays/` marked files if they exist

`stamp.sh` usage:

```bash
scripts/stamp.sh --target /path/to/product \
  --team F7T \
  --team-slug f7t \
  --product-blurb "R2CZ Auto Finder" \
  --boost-artisan artisan \
  --design-root design \
  --laravel-globs 'app/**,routes/**'
```

Replacements: `__TEAM__` `__TEAM_SLUG__` `__PRODUCT_BLURB__` `__BOOST_ARTISAN__` `__DESIGN_ROOT__` `__LARAVEL_GLOBS__`.

Never overwrite: `app/`, `resources/js/pages/`, product `docs/01-vision.md` if present. Do overwrite harness trees (they are the pin). Product `workflow.mdc` team name comes from flags, not a hand edit after stamp.

- [ ] **Step 1: Write the failing test `tests/stamp_test.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

if ! "$root/scripts/stamp.sh" --target "$tmp" --team F7T --team-slug f7t \
  --product-blurb "Test App" --boost-artisan artisan --design-root design; then
  echo "stamp.sh missing or failed"
  exit 1
fi

need() { [[ -f "$tmp/$1" && ! -L "$tmp/$1" ]] || { echo "missing $1"; exit 1; }; }

need .cursor/rules/caveman.mdc
need .cursor/rules/creative-mode.mdc
need .grok/rules/caveman.md
need .agents/rules/caveman.md
need .claude/rules/caveman.md
need .cursor/skills/linear/SKILL.md
need .claude/skills/linear/SKILL.md
need scripts/harness-parity.sh
need scripts/lint-commit-msg.sh
need lefthook.yml
need STANDARDS_VERSION
grep -q F7T "$tmp/.cursor/skills/linear/SKILL.md"
grep -q artisan "$tmp/.cursor/mcp.json"
grep -qv __TEAM__ "$tmp/.cursor/skills/linear/SKILL.md"
[[ -L "$tmp/.cursor/rules/caveman.mdc" ]] && { echo symlink; exit 1; }
echo "stamp_test: ok"
```

chmod +x.

- [ ] **Step 2: Run the test (expect fail)**

```bash
~/Code/funnysoft/standards/tests/stamp_test.sh
```

Expected: `stamp.sh missing or failed`

- [ ] **Step 3: Write `scripts/stamp.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
target=""; team=""; team_slug=""; blurb=""; boost="artisan"; design="design"; globs="app/**,routes/**,config/**,database/**,tests/**"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --target) target="$2"; shift 2 ;;
    --team) team="$2"; shift 2 ;;
    --team-slug) team_slug="$2"; shift 2 ;;
    --product-blurb) blurb="$2"; shift 2 ;;
    --boost-artisan) boost="$2"; shift 2 ;;
    --design-root) design="$2"; shift 2 ;;
    --laravel-globs) globs="$2"; shift 2 ;;
    *) echo "unknown $1" >&2; exit 2 ;;
  esac
done
[[ -n "$target" && -n "$team" && -n "$team_slug" && -n "$blurb" ]] || { echo "usage"; exit 2; }
mkdir -p "$target"
version="$(git -C "$root" describe --tags --always)"
copy_tree() {
  local src="$1" dest="$2"
  mkdir -p "$dest"
  if leftover="$(find "$src" -type l -print)"; then
    if [[ -n "$leftover" ]]; then
      echo "stamp: symlink in templates: $leftover" >&2
      exit 1
    fi
  fi
  cp -R "$src"/. "$dest"/
}
copy_tree "$root/templates/harness" "$target"
mkdir -p "$target/scripts" "$target/.github/workflows"
cp "$root/templates/scripts/"* "$target/scripts/"
cp "$root/templates/lefthook.yml" "$target/lefthook.yml"
cp "$root/templates/github/workflows/quality.yml" "$target/.github/workflows/quality.yml"
export team team_slug blurb boost design globs
find "$target" \( -path "$target/.git" -prune \) -o -type f -print0 | while IFS= read -r -d '' f; do
  perl -pi -e 's/__TEAM__/$ENV{team}/g; s/__TEAM_SLUG__/$ENV{team_slug}/g; s/__PRODUCT_BLURB__/$ENV{blurb}/g; s/__BOOST_ARTISAN__/$ENV{boost}/g; s/__DESIGN_ROOT__/$ENV{design}/g; s/__LARAVEL_GLOBS__/$ENV{globs}/g' "$f"
done
printf '%s\n' "$version" > "$target/STANDARDS_VERSION"
echo "stamped $version -> $target"
```

Use `cp -R` then `perl -pi` for placeholders. Refuse to copy if a template path is a symlink.

- [ ] **Step 4: Write product `templates/scripts/harness-parity.sh`**

Adapt Apex `scripts/harness-parity.sh`:

- Require `.claude` as well as `.grok` and `.agents`
- `boost.json` agents must include `codex,cursor,grok_build` (Claude is process-only; Boost may not list claude). Do not fail if Claude is absent from boost.json.
- MCP servers: `laravel-boost` and `mobbin` in cursor/grok/codex configs.
- No symlinks under `.cursor .grok .agents .codex .claude`

Repo-root `scripts/harness-parity.sh` checks `templates/harness` the same way (prefix `templates/harness`).

- [ ] **Step 5: Write stub `templates/scripts/php-gate.sh` and `frontend-gate.sh`**

php-gate.sh: `pint|phpstan|rector|pest|all` calling `vendor/bin/*` from the product root. pest: `php -d pcov.directory="$PWD" vendor/bin/pest --compact --coverage --min=100`.

frontend-gate.sh: `lint` → `bun run test:lint` (vp) or `oxlint --deny-warnings` if no `vp`; `typecheck` → `bun run test:types`; `test` → `bunx vitest run --coverage` when vitest exists else skip with message; `doctor` → `bunx --bun react-doctor@0.9.12 resources/js --no-telemetry -y` (Inertia) or apps paths (Next).

- [ ] **Step 6: Run the stamp test (expect pass)**

```bash
~/Code/funnysoft/standards/tests/stamp_test.sh
```

Expected: `stamp_test: ok`

- [ ] **Step 7: Run template parity**

```bash
~/Code/funnysoft/standards/scripts/harness-parity.sh
```

Expected: `harness-parity: ok`

- [ ] **Step 8: Commit**

```bash
git add scripts tests templates/scripts
git commit -m "feat: add stamp.sh and harness-parity for four trees"
```

---

### Task 7: Tag v0.1.0

**Files:**
- Create: none
- Modify: git tag

- [ ] **Step 1: Push the branch**

```bash
git push -u origin harness/f7t-127-standards-repo
```

- [ ] **Step 2: Open the PR after adversary (exempt only if the owner says this bootstrap is PR #1 exception). Title:**

`chore: add FunnySoft engineering playbook and stamp script`

Body must cite F7T-127.

- [ ] **Step 3: After owner squash-merge, tag**

```bash
git checkout main && git pull
git tag -a v0.1.0 -m "FunnySoft standards v0.1.0"
git push origin v0.1.0
```

Do not tag before merge.

---

## Spec coverage (F7T-127)

| Spec item | Task |
| --- | --- |
| Docs + templates + stamp | 2, 4, 6 |
| Four harnesses including Claude | 4 |
| Placeholders / pin | 6 |
| Boost guidelines copy | 5 |
| Lefthook = CI quality template | 3 |
| lint-commit-msg allowlist | 3 |
| Horizon in playbook (not Apex no-Horizon) | 2, 4 |
| No Sail / Cursor Cloud | 2 |
| GitHub funnysoft-code/standards | 1 |
| v0.1.0 tag | 7 |

peca-certa apply is F7T-128, not this plan.
