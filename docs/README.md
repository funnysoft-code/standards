# FunnySoft engineering playbook

This directory is the source of truth for process, quality, harness, design, and stack variants. Products record a version tag in `STANDARDS_VERSION` and its full commit SHA and export digest in `STANDARDS_MANIFEST.json`. Stamp copies applicable harness trees, shared scripts, Lefthook, and playbook-required docs. Product vision and named deviations stay in the product repo.

English for playbook, ADRs, templates, and commit messages. Product UI locale is product.

## Three layers

1. **Playbook** (this repo). Shared policy and reusable engineering assets for FunnySoft products, applied by stack.
2. **Stack variant.** Inertia monolith, API+Next, or Next-only. Backend layout, HTTP contract, deploy defaults.
3. **Product repo.** Vision, domain language, named deviations.

AGENTS.md in a product is short. It points at the playbook pin, the variant doc, and the product pillars.

## Index

| Doc                                                          | Purpose                                                           |
| ------------------------------------------------------------ | ----------------------------------------------------------------- |
| [engineering.md](engineering.md)                             | Nets, git, review, adversary, PHP conventions, definition of done |
| [harness.md](harness.md)                                     | OpenCode tree, Boost vs process, overlay, retro                   |
| [design.md](design.md)                                       | Visual loop, mock store, screenshots                              |
| [quality.md](quality.md)                                     | Named gates and product-code include lists                        |
| [variants/inertia-monolith.md](variants/inertia-monolith.md) | Laravel + Inertia + React                                         |
| [variants/api-next.md](variants/api-next.md)                 | Laravel API + Next (and Expo when a store app exists)             |
| [variants/next-only.md](variants/next-only.md)               | Marketing and sites. No Laravel.                                  |
| [adr/](adr/README.md)                                        | Playbook Architecture Decision Records                            |

## Reading order

1. [engineering.md](engineering.md)
2. [harness.md](harness.md)
3. [design.md](design.md)
4. [quality.md](quality.md)
5. The variant for the product you are in
6. [adr/](adr/README.md) when a decision affects your work

## Consumption

Stamp always copies the pinned playbook into `docs/playbook/`, including variant and ADR documents needed by relative links. Reading it offline does not require a sibling standards checkout. Historical implementation plans are excluded. Products do not get vision docs from here.

Standards owns policy and engineering assets. `f7t-stack` owns the wizard, runnable application templates, dependency locks, and generator release compatibility manifest. A generator release bundles a tested export under `template/standards/` and records its own version and template revision alongside the standards release, commit, and asset digest. It verifies the expected digest before writing a target. Generation does not fetch a moving standards branch.

### Export interface, schema version 1

Node.js 22 or newer and Bash are required. From the standards repository:

```sh
bash scripts/export.sh --target /path/to/new-export --release v1.2.3 --commit FULL_40_CHARACTER_SHA
bash scripts/stamp.sh --target /path/to/product --variant api-next \
  --from-export /path/to/new-export --expected-digest EXPECTED_SHA256 \
  --team F7T --team-slug f7t --product-blurb 'Product purpose'
```

The export destination must not exist. Release export requires an explicit version tag and a full lowercase commit SHA. Branch names, abbreviated SHAs, and absent identity fail. The release coordinator verifies that the tag resolves to that commit and exports the tested checkout; supplying identity is not a Git provenance attestation. Never reuse a release identity for changed assets.

Direct stamping accepts the same `--variant`, `--release`, and `--commit`, creates an export in a temporary directory, then calls the same apply implementation. The older invocation without a variant or identity still stamps an Inertia checkout, labeled `local-<full SHA>`. Local stamps are not distributable releases. Only that legacy mode accepts `--boost-artisan`, `--design-root`, and `--laravel-globs` overrides.

`templates/manifest.json` declares named asset sets, explicit source/destination paths, text policy, exclusions, and layouts. Add asset sets for new engineering tooling without creating another selection algorithm. Binary assets declare `text: false` and retain their bytes. Missing sources, symlinks, duplicate paths, unknown transforms, and unresolved tokens fail explicitly.

An export contains:

- `manifest.json`: `schemaVersion`, `standards: { release, commit }`, `local`, `variants`, `runtime`, and `assetDigest`.
- `variants[variant]`: `layout`, selected `assetSets`, and `assets`. Each asset has target-relative `path`, export-relative `source`, `sha256`, numeric `mode` of 420 or 493, and boolean `text`.
- `variants/<variant>/files/`: selected assets with layout tokens already resolved. Only team, team-slug, and product-blurb placeholders remain until apply.
- `apply.mjs`: the shared dependency-free Node implementation, also hashed in `runtime`.

`assetDigest` is SHA-256 of `JSON.stringify` of the parsed manifest with `assetDigest` omitted, retaining property order. It binds identity, layouts, asset paths, text policies, modes, asset hashes, and runtime hash. Consumers must pin this digest in their release manifest. Every asset in all three variants and the runtime is checked before target writes. Unsupported schemas, malformed paths, missing files, or mismatched hashes fail.

U3 can import `verifyExport(exportRoot, expectedDigest)` and `applyExport({ exportRoot, target, variant, team, teamSlug, productBlurb, expectedDigest })` from the bundled `apply.mjs`, or invoke `node apply.mjs apply --from-export ...` with the stamp flags above. The package release must validate the bundle before trusting its executable runtime. Apply writes only declared asset paths and the two standards identity files. It preserves unrelated target files, including binary assets and product scripts. It rejects symlink destinations.

The generated `STANDARDS_MANIFEST.json` records `schemaVersion`, `standards`, `assetDigest`, `variant`, `layout`, and `local`. Generator/template identity belongs to the generator's own release receipt; it must not be guessed by standards.

Receipt JSON uses two-space object indentation and compact primitive arrays for
the declared layouts. Stamping needs no formatter or installed product packages.
Before advancing an export, run `bash tests/stamp_test.sh`,
`bash tests/gates_test.sh /path/to/installed/@playwright/test`, and
`node tests/format_test.mjs /path/to/installed/oxfmt` from this repository.
The formatter fixture checks all three stamped layouts and receipt semantics,
direct/export parity, and fresh API artifacts against the installed formatter.
The gate fixtures require an already-installed `@playwright/test` package directory
containing `cli.js` and its installed dependencies. The verified version is 1.62.1;
the fixtures collect declarations without launching browsers or downloading tools.
Clean-checkout workflow fixtures execute the exported shell steps with traced
JS tools and isolated browser-cache directories. They check browser installation
per matrix job, root environment preparation before the Next build, and failures
when either prerequisite is removed. These fixtures do not run full application
builds or the Horizon integration suite.
The current formatter compatibility target is oxfmt 0.65.0.

Linear via the Linear CLI is the issue SSOT. Workspace `funnysoft`. Do not create or update Linear documents. Process and roadmap live in git. Parked options and the current lean live on the issue body.
