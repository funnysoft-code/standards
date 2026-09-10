#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
tmp="$(mktemp -d)"
keep="$(mktemp -d)"
trap 'rm -rf "$tmp" "$keep"' EXIT

# Export and direct stamping must consume one contract.
node --input-type=module - "$root" "$keep" <<'NODE'
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const [root, tmp] = process.argv.slice(2);
const commit = '0123456789abcdef0123456789abcdef01234567';
const identity = ['--release', 'v0.0.0-fixture', '--commit', commit];
const product = ['--team', 'F7T', '--team-slug', 'f7t', '--product-blurb', 'Test $& App'];
function run(script, args, error) {
  const result = spawnSync('bash', [path.join(root, 'scripts', script), ...args], { encoding: 'utf8' });
  if (error) {
    assert.notEqual(result.status, 0, 'must reject ' + args.join(' '));
    assert.match(result.stderr, error);
  } else assert.equal(result.status, 0, result.stderr || result.stdout);
}
function snapshot(directory) {
  const result = [];
  function collect(relative = '') {
    for (const entry of fs.readdirSync(path.join(directory, relative), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const name = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) collect(name);
      else result.push({ name, mode: fs.statSync(path.join(directory, name)).mode & 0o777, bytes: fs.readFileSync(path.join(directory, name)).toString('hex') });
    }
  }
  collect();
  return result;
}
const bundle = path.join(tmp, 'export');
run('export.sh', ['--target', bundle, ...identity]);
const manifest = JSON.parse(fs.readFileSync(path.join(bundle, 'manifest.json')));
assert.equal(manifest.schemaVersion, 1);
assert.deepEqual(manifest.standards, { release: 'v0.0.0-fixture', commit });
assert.match(manifest.assetDigest, /^[a-f0-9]{64}$/);
assert.deepEqual(Object.keys(manifest.variants).sort(), ['api-next', 'inertia-monolith', 'next-only']);
for (const variant of Object.keys(manifest.variants)) {
  const direct = path.join(tmp, variant);
  const imported = path.join(tmp, variant + '-import');
  fs.mkdirSync(path.join(direct, 'scripts'), { recursive: true });
  const binary = Buffer.from([0, 255, ...Buffer.from('__TEAM__'), 128]);
  fs.writeFileSync(path.join(direct, 'scripts/product.bin'), binary);
  fs.writeFileSync(path.join(direct, 'scripts/product.sh'), '# __TEAM__\n');
  fs.writeFileSync(path.join(direct, 'AGENTS.md'), 'Short product brief\n');
  fs.chmodSync(path.join(direct, 'scripts/product.sh'), 0o640);
  run('stamp.sh', ['--target', direct, '--variant', variant, ...identity, ...product]);
  run('stamp.sh', ['--target', imported, '--variant', variant, '--from-export', bundle, '--expected-digest', manifest.assetDigest, ...product]);
  assert.deepEqual(fs.readFileSync(path.join(direct, 'scripts/product.bin')), binary);
  assert.equal(fs.readFileSync(path.join(direct, 'scripts/product.sh'), 'utf8'), '# __TEAM__\n');
  assert.ok(fs.readFileSync(path.join(direct, 'AGENTS.md'), 'utf8').startsWith('Short product brief\n'));
  assert.equal(fs.statSync(path.join(direct, 'scripts/product.sh')).mode & 0o777, 0o640);
  const metadata = JSON.parse(fs.readFileSync(path.join(direct, 'STANDARDS_MANIFEST.json')));
  assert.deepEqual(metadata.standards, manifest.standards);
  assert.equal(metadata.variant, variant);
  assert.equal(metadata.assetDigest, manifest.assetDigest);
  for (const asset of manifest.variants[variant].assets) {
    const a = fs.readFileSync(path.join(direct, asset.path));
    if (asset.path !== 'AGENTS.md') assert.deepEqual(a, fs.readFileSync(path.join(imported, asset.path)), asset.path);
    assert.equal(fs.statSync(path.join(direct, asset.path)).mode & 0o777, asset.mode);
    if (asset.text) assert.doesNotMatch(a.toString(), /__[A-Z][A-Z0-9_]*__/);
    if (asset.path.startsWith('docs/playbook/') && asset.path.endsWith('.md')) {
      for (const [, link] of a.toString().matchAll(/\]\(([^)]+)\)/g)) {
        if (/^(?:[a-z]+:|#)/i.test(link)) continue;
        const linked = path.resolve(direct, path.dirname(asset.path), link.split('#')[0]);
        assert.ok(fs.existsSync(linked), `${asset.path}: missing offline link ${link}`);
      }
    }
  }
  for (const doc of ['README.md', 'engineering.md', 'quality.md', 'harness.md', 'design.md', `variants/${variant}.md`, 'adr/README.md', 'adr/0000-template.md']) {
    assert.ok(fs.existsSync(path.join(direct, 'docs/playbook', doc)), doc);
  }
  const config = fs.readFileSync(path.join(direct, 'opencode.json'), 'utf8');
  const runtimeConfig = JSON.parse(config);
  assert.ok(runtimeConfig.mcp.mobbin);
  for (const key of ['providers', 'permissions', 'model', 'agents']) assert.ok(!(key in runtimeConfig));
  assert.ok(!runtimeConfig.mcp.servers);
  const sync = spawnSync(process.execPath, [path.join(direct, 'scripts/provider-sync.mjs'), '--root', direct, '--check'], { encoding: 'utf8' });
  assert.equal(sync.status, 0, sync.stderr || sync.stdout);
  assert.ok(fs.statSync(path.join(direct, 'scripts/frontend-gate.sh')).mode & 0o111);
  const cloudWorkflow = path.join(direct, '.github/workflows/deploy-cloud.yml');
  const vercelWorkflow = path.join(direct, '.github/workflows/deploy-vercel.yml');
  assert.equal(fs.existsSync(cloudWorkflow), variant !== 'next-only');
  assert.equal(fs.existsSync(vercelWorkflow), variant !== 'inertia-monolith');
  if (variant !== 'next-only') {
    assert.ok(fs.existsSync(path.join(direct, '.agents/skills/funnysoft-quality/SKILL.md')));
    assert.ok(fs.statSync(path.join(direct, 'scripts/php-gate.sh')).mode & 0o111);
  }
  if (variant === 'api-next') {
    assert.equal(metadata.layout.phpRoot, 'services/api');
    assert.deepEqual(metadata.layout.jsRoots, ['apps/web', 'packages/api-client', 'packages/design-system']);
    assert.match(config, /services\/api\/artisan/);
    assert.ok(fs.existsSync(path.join(direct, 'services/api/packages/boost-guidelines/composer.json')));
  }
  if (variant === 'next-only') {
    assert.equal(metadata.layout.phpRoot, null);
    assert.doesNotMatch(config, /php|boost|artisan/i);
    for (const asset of manifest.variants[variant].assets) {
      assert.doesNotMatch(asset.path, /\.php$|boost|php-gate|laravel-api/);
      if (asset.path === 'lefthook.yml' || asset.path.endsWith('/quality.yml')) {
        assert.doesNotMatch(fs.readFileSync(path.join(direct, asset.path), 'utf8'), /php|composer|artisan|boost/i);
      }
    }
  }
}
const untouched = path.join(tmp, 'invalid-target');
run('export.sh', ['--target', untouched], /release|identity/);
run('export.sh', ['--target', untouched, '--release', 'main', '--commit', commit], /release|immutable/);
run('export.sh', ['--target', untouched, '--release', 'v1.0.0'], /commit|identity/);
run('stamp.sh', ['--target', untouched, '--variant', 'unknown', ...identity, ...product], /variant/);
run('stamp.sh', ['--target', untouched, '--variant', 'next-only', ...product], /release|identity/);
assert.ok(!fs.existsSync(untouched));
const original = fs.readFileSync(path.join(bundle, 'manifest.json'));
const bad = structuredClone(manifest);
for (const invalid of ['../escaped', '/absolute']) {
  bad.variants['next-only'].assets[0].path = invalid;
  fs.writeFileSync(path.join(bundle, 'manifest.json'), JSON.stringify(bad));
  run('stamp.sh', ['--target', untouched, '--variant', 'next-only', '--from-export', bundle, '--expected-digest', manifest.assetDigest, ...product], /path/);
}
for (const mutation of [
  (value) => { value.variants['next-only'].assets[0].source = '../escape'; },
  (value) => { value.variants['next-only'].assets[0].mode = 511; },
  (value) => { delete value.standards.commit; },
  (value) => { value.standards.release = 'main'; },
  (value) => { value.variants['next-only'].assets = []; },
]) {
  const changed = structuredClone(manifest);
  mutation(changed);
  fs.writeFileSync(path.join(bundle, 'manifest.json'), JSON.stringify(changed));
  run('stamp.sh', ['--target', untouched, '--variant', 'next-only', '--from-export', bundle, '--expected-digest', manifest.assetDigest, ...product], /path|mode|identity|assets/);
}
fs.writeFileSync(path.join(bundle, 'manifest.json'), JSON.stringify({ ...manifest, schemaVersion: 99 }));
run('stamp.sh', ['--target', untouched, '--variant', 'next-only', '--from-export', bundle, '--expected-digest', manifest.assetDigest, ...product], /schema/);
fs.writeFileSync(path.join(bundle, 'manifest.json'), original);
const digestTarget = path.join(tmp, 'digest-target');
fs.mkdirSync(digestTarget);
fs.writeFileSync(path.join(digestTarget, 'sentinel.txt'), 'unchanged\n');
const digestSnapshot = snapshot(digestTarget);
run('stamp.sh', ['--target', digestTarget, '--variant', 'next-only', '--from-export', bundle, ...product], /expected digest/);
assert.deepEqual(snapshot(digestTarget), digestSnapshot, 'missing digest must not change the target');
const { applyExport } = await import(pathToFileURL(path.join(root, 'scripts/standards-export.mjs')).href);
assert.throws(() => applyExport({ exportRoot: bundle, target: digestTarget, variant: 'next-only', team: 'F7T', teamSlug: 'f7t', productBlurb: 'Example', allowLocal: true }), /expected digest/);
assert.deepEqual(snapshot(digestTarget), digestSnapshot, 'public API digest rejection must not change the target');
run('stamp.sh', ['--target', digestTarget, '--variant', 'next-only', '--from-export', bundle, '--expected-digest', '0'.repeat(64), ...product], /digest/);
assert.deepEqual(snapshot(digestTarget), digestSnapshot, 'wrong digest must not change the target');
run('stamp.sh', ['--target', untouched, '--variant', 'next-only', '--from-export', bundle, '--expected-digest', manifest.assetDigest, '--team', '__UNKNOWN__', '--team-slug', 'f7t', '--product-blurb', 'Example'], /unresolved token/);
const symlinkTarget = path.join(tmp, 'symlink-target');
const outside = path.join(tmp, 'outside');
fs.mkdirSync(symlinkTarget);
fs.mkdirSync(outside);
fs.symlinkSync(outside, path.join(symlinkTarget, '.opencode'));
run('stamp.sh', ['--target', symlinkTarget, '--variant', 'next-only', '--from-export', bundle, '--expected-digest', manifest.assetDigest, ...product], /symlink/);
assert.deepEqual(fs.readdirSync(outside), []);
assert.deepEqual(fs.readdirSync(symlinkTarget), ['.opencode']);
// The bundled apply implementation runs without a standards checkout.
const standalone = spawnSync(process.execPath, [path.join(bundle, 'apply.mjs'), 'apply', '--from-export', bundle, '--target', path.join(tmp, 'standalone'), '--variant', 'api-next', '--expected-digest', manifest.assetDigest, ...product], { encoding: 'utf8' });
assert.equal(standalone.status, 0, standalone.stderr);
const asset = manifest.variants['next-only'].assets[0];
const assetBytes = fs.readFileSync(path.join(bundle, asset.source));
fs.appendFileSync(path.join(bundle, asset.source), 'tampered');
run('stamp.sh', ['--target', untouched, '--variant', 'next-only', '--from-export', bundle, '--expected-digest', manifest.assetDigest, ...product], /digest/);
assert.ok(!fs.existsSync(untouched), 'validation must precede target writes');
fs.writeFileSync(path.join(bundle, asset.source), assetBytes);
// Existing native provider settings and preservation state require an explicit
// reconciliation. A failed upgrade must leave every target byte unchanged.
const upgradeBase = path.join(tmp, 'upgrade-base');
run('stamp.sh', ['--target', upgradeBase, '--variant', 'next-only', '--from-export', bundle, '--expected-digest', manifest.assetDigest, ...product]);
run('stamp.sh', ['--target', upgradeBase, '--variant', 'next-only', '--from-export', bundle, '--expected-digest', manifest.assetDigest, ...product]);
const upgradeMutations = [
  ['custom root MCP setting', (target) => {
    const file = path.join(target, '.mcp.json');
    const value = JSON.parse(fs.readFileSync(file));
    value.customSetting = { enabled: true };
    fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
  }],
  ['custom Cursor MCP setting', (target) => {
    const file = path.join(target, '.cursor/mcp.json');
    const value = JSON.parse(fs.readFileSync(file));
    value.customSetting = { enabled: true };
    fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
  }],
  ['custom Grok table', (target) => fs.appendFileSync(path.join(target, '.grok/config.toml'), '\n[custom]\nenabled = true\n')],
  ['custom Codex table', (target) => fs.appendFileSync(path.join(target, '.codex/config.toml'), '\n[custom]\nenabled = true\n')],
  ['provider preservedClaude state', (target) => {
    const file = path.join(target, '.agents/provider-sync.json');
    const value = JSON.parse(fs.readFileSync(file));
    value.preservedClaude = ['CLAUDE.md'];
    fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
  }],
  ['preserved runtime CLAUDE file', (target) => fs.appendFileSync(path.join(target, 'CLAUDE.md'), '\nProduct-specific Claude instruction.\n')],
];
for (const malformed of [
  '<!-- funnysoft-provider-sync:start -->\na\n<!-- funnysoft-provider-sync:end -->\n'.repeat(2),
  '<!-- funnysoft-provider-sync:end -->\n<!-- funnysoft-provider-sync:start -->',
  '<!-- funnysoft-provider-sync:start -->\n<!-- funnysoft-provider-sync:start -->\n<!-- funnysoft-provider-sync:end -->',
]) {
  const target = path.join(tmp, 'malformed-markers-' + Buffer.from(malformed).toString('hex').slice(-20));
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(path.join(target, 'AGENTS.md'), malformed);
  const before = snapshot(target);
  run('stamp.sh', ['--target', target, '--variant', 'next-only', '--from-export', bundle, '--expected-digest', manifest.assetDigest, ...product], /malformed provider-sync markers/);
  assert.deepEqual(snapshot(target), before, 'malformed markers must fail before writes');
}
for (const [label, mutate] of upgradeMutations) {
  const target = path.join(tmp, 'upgrade-' + label.toLowerCase().replaceAll(/[^a-z]+/g, '-'));
  fs.cpSync(upgradeBase, target, { recursive: true });
  mutate(target);
  const before = snapshot(target);
  run('stamp.sh', ['--target', target, '--variant', 'next-only', '--from-export', bundle, '--expected-digest', manifest.assetDigest, ...product], /provider reconciliation required/);
  assert.deepEqual(snapshot(target), before, `${label} rejection must leave the target unchanged`);
}
// Future asset sets can carry binaries without decoding or token substitution.
const sourceFixture = path.join(tmp, 'source');
for (const dir of ['templates', 'docs', 'packages', 'scripts']) fs.cpSync(path.join(root, dir), path.join(sourceFixture, dir), { recursive: true });
const sourceManifest = path.join(sourceFixture, 'templates/manifest.json');
const spec = JSON.parse(fs.readFileSync(sourceManifest));
const binaryAsset = Buffer.from([0, 255, ...Buffer.from('__TEAM__'), 128]);
fs.writeFileSync(path.join(sourceFixture, 'templates/fixture.bin'), binaryAsset);
spec.assetSets.harness.push({ source: 'templates/fixture.bin', destination: 'fixture.bin', text: false });
fs.writeFileSync(sourceManifest, JSON.stringify(spec));
const fixtureBundle = path.join(tmp, 'binary-export');
const binaryExport = spawnSync('bash', [path.join(sourceFixture, 'scripts/export.sh'), '--target', fixtureBundle, ...identity], { encoding: 'utf8' });
assert.equal(binaryExport.status, 0, binaryExport.stderr);
const binaryManifest = JSON.parse(fs.readFileSync(path.join(fixtureBundle, 'manifest.json')));
run('stamp.sh', ['--target', path.join(tmp, 'binary-applied'), '--variant', 'next-only', '--from-export', fixtureBundle, '--expected-digest', binaryManifest.assetDigest, ...product]);
assert.deepEqual(fs.readFileSync(path.join(tmp, 'binary-applied/fixture.bin')), binaryAsset);
spec.assetSets.harness.push({ source: 'templates/missing.txt', destination: 'missing.txt', text: true });
fs.writeFileSync(sourceManifest, JSON.stringify(spec));
const missing = spawnSync('bash', [path.join(sourceFixture, 'scripts/export.sh'), '--target', untouched, ...identity], { encoding: 'utf8' });
assert.notEqual(missing.status, 0);
assert.match(missing.stderr, /missing asset/);
assert.ok(!fs.existsSync(untouched));
console.log('export fixtures: ok');
NODE

mkdir -p "$tmp/vendor"
printf '%s\n' '<?php echo "__TEAM__";' > "$tmp/vendor/x.php"
printf 'PNG\x89__TEAM__\x00binary' > "$tmp/logo.png"
cp "$tmp/vendor/x.php" "$keep/x.php"
cp "$tmp/logo.png" "$keep/logo.png"

if ! "$root/scripts/stamp.sh" --target "$tmp" --team F7T --team-slug f7t \
  --product-blurb "Test App" --boost-artisan artisan --design-root design; then
  echo "stamp.sh missing or failed"
  exit 1
fi

cmp -s "$keep/x.php" "$tmp/vendor/x.php" || { echo "rewrote vendor/x.php"; exit 1; }
cmp -s "$keep/logo.png" "$tmp/logo.png" || { echo "rewrote PNG"; exit 1; }

need() { [[ -f "$tmp/$1" && ! -L "$tmp/$1" ]] || { echo "missing $1"; exit 1; }; }

need .agents/rules/caveman.md
need .agents/rules/product.md
need .agents/skills/creative-mode/SKILL.md
need .agents/skills/linear/SKILL.md
need .opencode/agent/adversary.md
need opencode.json
need scripts/boost-sync-opencode-skills.sh
need scripts/lint-commit-msg.sh
need lefthook.yml
need STANDARDS_VERSION
need packages/boost-guidelines/resources/boost/guidelines/core.blade.php
grep -q F7T "$tmp/.agents/skills/linear/SKILL.md"
grep -q artisan "$tmp/opencode.json"
grep -qv __TEAM__ "$tmp/.agents/skills/linear/SKILL.md"
node - "$tmp/.agents/rules/product.md" <<'NODE'
const product = require("fs").readFileSync(process.argv[2], "utf8")
const authority = `Use sources in this order:

1. Product facts and named deviations.
2. Accepted product decisions and design authority.
3. The pinned shared playbook.
4. Inferred code patterns.`

if (!product.includes(authority)) process.exit(1)
for (const contract of [
  "the coordinator asks the owner one focused question",
  "A subagent returns the conflict and smallest unresolved question to the coordinator as blocked",
  "Discover context before loading it broadly",
]) {
  if (!product.includes(contract)) process.exit(1)
}
NODE
node - "$tmp/opencode.json" <<'NODE'
const config = JSON.parse(require("fs").readFileSync(process.argv[2], "utf8"))
for (const key of ["model", "small_model", "provider", "enabled_providers", "disabled_providers"]) {
  if (key in config) process.exit(1)
}
for (const role of ["context-scout", "research-specialist", "implementation-worker"]) {
  if (config.agent && role in config.agent) process.exit(1)
}
NODE
[[ -L "$tmp/.agents/rules/caveman.md" ]] && { echo symlink; exit 1; }
for native in .cursor/mcp.json .grok/config.toml .codex/config.toml .claude/skills/linear/SKILL.md CLAUDE.md; do
  need "$native"
done

if grep -R -E -n -- '(^|[^.[:alnum:]_-])(openai|anthropic|xai|cursor)/[A-Za-z0-9._-]+|^model:[[:space:]]' "$tmp"; then
  echo "personal model or provider leaked into shared harness"
  exit 1
fi

for role in context-scout research-specialist implementation-worker; do
  if grep -R -F -n -- "$role" "$tmp"; then
    echo "global role stamped: $role"
    exit 1
  fi
done

adversary="$tmp/.agents/reviewers/adversary.md"
workflow="$tmp/.agents/rules/workflow.md"
node - "$adversary" "$workflow" <<'NODE'
const fs = require("fs")
const adversary = fs.readFileSync(process.argv[2], "utf8")
const workflow = fs.readFileSync(process.argv[3], "utf8")

for (const contract of [
  "`approve`, `revise`, or `block`",
  "Critical: correctness",
  "High: a defect that would ship broken or incomplete work",
  "Medium: hygiene",
  "Low: optional taste",
  "re-dispatch on the new SHA",
  "A repository verdict names the committed SHA",
  "A machine-local configuration verdict names the complete reviewed source-hash and runtime-identity set",
]) {
  if (!adversary.includes(contract)) process.exit(1)
}
if (!workflow.includes("no Medium or higher findings")) process.exit(1)
if (!workflow.includes("The coordinator may make local checkpoint commits and push when the owner has authorized it")) process.exit(1)
if (!workflow.includes("Subagents do not change Git or lifecycle state")) process.exit(1)
NODE

token_re='__TEAM__|__TEAM_SLUG__|__PRODUCT_BLURB__|__BOOST_ARTISAN__|__DESIGN_ROOT__|__LARAVEL_GLOBS__'
overlay_paths=(
  "$tmp/.agents"
  "$tmp/opencode.json"
  "$tmp/scripts"
  "$tmp/lefthook.yml"
  "$tmp/.github/workflows/quality.yml"
)
for p in "${overlay_paths[@]}"; do
  [[ -e "$p" ]] || { echo "missing overlay $p"; exit 1; }
  if grep -R -E -n -- "$token_re" "$p"; then
    echo "leftover tokens in $p"
    exit 1
  fi
done

echo "stamp_test: ok"
