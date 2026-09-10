import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createExport, applyExport, verifyExport } from '../scripts/standards-export.mjs';

// Explicit installed binary keeps this test reproducible without downloading tools.
const formatter = path.resolve(process.argv[2] ?? 'node_modules/.bin/oxfmt');
assert.ok(fs.existsSync(formatter), 'usage: node tests/format_test.mjs /path/to/installed/oxfmt');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'standards-format-'));
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });
  assert.equal(result.status, 0, result.stderr + result.stdout);
  return result.stdout;
}
function put(file, content, mode = 0o644) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, { mode });
}
try {
  console.log(run(formatter, ['--version']).trim());
  const bundle = path.join(tmp, 'bundle');
  const commit = '0123456789abcdef0123456789abcdef01234567';
  const release = 'v0.0.0-fixture';
  const manifest = createExport({ sourceRoot: root, target: bundle, commit, release });
  const { assetDigest, ...content } = JSON.parse(fs.readFileSync(path.join(bundle, 'manifest.json')));
  assert.equal(assetDigest, createHash('sha256').update(JSON.stringify(content)).digest('hex'));
  verifyExport(bundle, assetDigest);
  for (const variant of Object.keys(manifest.variants)) {
    const app = path.join(tmp, variant);
    const direct = path.join(tmp, variant + '-direct');
    applyExport({ exportRoot: bundle, target: app, variant, team: 'F7T', teamSlug: 'f7t', productBlurb: 'Fixture', expectedDigest: assetDigest });
    // Stamping runs before product dependencies exist, including the formatter.
    assert.ok(!fs.existsSync(path.join(app, 'node_modules')));
    run('bash', [path.join(root, 'scripts/stamp.sh'), '--target', direct, '--variant', variant, '--release', release, '--commit', commit, '--team', 'F7T', '--team-slug', 'f7t', '--product-blurb', 'Fixture']);
    const files = [...manifest.variants[variant].assets.map((asset) => asset.path), 'STANDARDS_MANIFEST.json'];
    for (const file of files) assert.deepEqual(fs.readFileSync(path.join(app, file)), fs.readFileSync(path.join(direct, file)), file);
    const receipt = JSON.parse(fs.readFileSync(path.join(app, 'STANDARDS_MANIFEST.json')));
    assert.deepEqual(receipt, { schemaVersion: 1, standards: manifest.standards, assetDigest, variant, layout: manifest.variants[variant].layout, local: false });
    run(formatter, ['--check', ...files.filter((file) => /\.(?:md|json|mjs|yml)$/.test(file))], { cwd: app });
    const linear = fs.readFileSync(path.join(app, '.agents/skills/linear/SKILL.md'), 'utf8');
    assert.ok(linear.includes('A `F7T` blocker'));
    assert.ok(linear.includes('(`F7T-nnn`)'));
    assert.doesNotMatch(linear, /__TEAM__|\*\*TEAM\*\*/);
    console.log(`ok: ${variant} formatted assets, receipt semantics, dependency-free stamp parity`);
  }

  for (const variant of ['inertia-monolith', 'api-next']) {
    const app = path.join(tmp, 'boost-' + variant);
    applyExport({ exportRoot: bundle, target: app, variant, team: 'F7T', teamSlug: 'f7t', productBlurb: 'Fixture', expectedDigest: assetDigest });
    put(path.join(app, 'package.json'), '{"name":"formatter-fixture","private":true}\n');
    const phpRoot = variant === 'api-next' ? path.join(app, 'services/api') : app;
    const generated = path.join(phpRoot, '.agents/skills');
    const destination = path.join(app, '.agents/skills');
    const brief = 'Short product brief\n';
    put(path.join(app, 'AGENTS.md'), brief);
    put(path.join(app, 'boost.json'), '{"agents":["opencode"],"skills":["pest-testing"]}');
    put(path.join(phpRoot, 'boost.json'), '{"agents":["opencode"],"skills":["pest-testing"]}');
    if (phpRoot !== app) put(path.join(phpRoot, 'AGENTS.md'), 'API instructions\n\n| Gate | Tool |\n| --- | --- |\n| PHP | Pest |\n');
    put(path.join(generated, 'pest-testing/SKILL.md'), '# Pest\n\n| Tool | Command |\n| --- | --- |\n| Pest | `pest` |\n');
    put(path.join(app, 'reference-source/example.md'), '# Reference\n\nUse *Pest*.\n');
    fs.symlinkSync(path.join(app, 'reference-source'), path.join(generated, 'pest-testing/references'));
    put(path.join(app, 'untouched-policy.md'), 'Keep  *authored policy*  spacing.\n');
    const policy = fs.readFileSync(path.join(app, 'untouched-policy.md'));
    const selectedFormatter = variant === 'inertia-monolith' && process.argv[3] ? path.resolve(process.argv[3]) : formatter;
    const toolName = selectedFormatter === formatter ? 'oxfmt' : 'vp';
    const executable = path.join(app, 'node_modules/.bin', toolName);
    fs.mkdirSync(path.dirname(executable), { recursive: true });
    fs.symlinkSync(selectedFormatter, executable);
    const invoke = () => spawnSync('bash', [path.join(app, 'scripts/boost-sync-opencode-skills.sh')], { cwd: tmp, encoding: 'utf8' });
    function snapshot() {
      function walk(dir) {
        return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((entry) => {
          if (entry.name === 'node_modules') return [];
          const file = path.join(dir, entry.name);
          return entry.isDirectory() ? walk(file) : [[path.relative(app, file), entry.isSymbolicLink() ? `link:${fs.readlinkSync(file)}` : fs.readFileSync(file, 'base64')]];
        });
      }
      return walk(app);
    }
    const before = snapshot();
    fs.renameSync(executable, executable + '.off');
    let result = invoke();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /formatter missing/);
    assert.deepEqual(snapshot(), before);
    fs.renameSync(executable + '.off', executable);
    // A malformed final metadata file must not partially update earlier skills.
    const boost = path.join(phpRoot, 'boost.json');
    const validBoost = fs.readFileSync(boost);
    fs.writeFileSync(boost, '{ invalid json');
    const invalid = snapshot();
    result = invoke();
    assert.notEqual(result.status, 0);
    assert.deepEqual(snapshot(), invalid);
    fs.writeFileSync(boost, validBoost);
    // No .ai tree: Inertia's generated skills already occupy the destination.
    assert.ok(!fs.existsSync(path.join(phpRoot, '.ai')));
    result = invoke();
    assert.equal(result.status, 0, result.stderr);
    assert.ok(fs.readFileSync(path.join(app, 'AGENTS.md'), 'utf8').startsWith(brief));
    assert.deepEqual(fs.readFileSync(path.join(app, 'untouched-policy.md')), policy);
    assert.ok(!fs.lstatSync(path.join(generated, 'pest-testing/references')).isSymbolicLink());
    assert.ok(!fs.lstatSync(path.join(destination, 'pest-testing/references')).isSymbolicLink());
    const paths = [destination, generated, path.join(app, 'AGENTS.md'), path.join(app, 'boost.json'), boost];
    if (phpRoot !== app) paths.push(path.join(phpRoot, 'AGENTS.md'));
    run(selectedFormatter, [...(toolName === 'vp' ? ['fmt'] : []), '--check', ...paths], { cwd: app });
    const once = snapshot();
    assert.equal(invoke().status, 0);
    assert.deepEqual(snapshot(), once);
    // Boost can append guidelines to the authored root brief.
    fs.appendFileSync(path.join(app, 'AGENTS.md'), '\n<laravel-boost-guidelines>\n\nUse *Boost*.\n\n</laravel-boost-guidelines>\n');
    result = invoke();
    assert.equal(result.status, 0, result.stderr);
    assert.ok(fs.readFileSync(path.join(app, 'AGENTS.md'), 'utf8').startsWith(brief));
    assert.match(fs.readFileSync(path.join(app, 'AGENTS.md'), 'utf8'), /laravel-boost-guidelines/);
    // Cloud precedence is retained and its app-local source is formatted too.
    const cloud = path.join(phpRoot, '.ai/skills/pest-testing');
    put(path.join(cloud, 'SKILL.md'), '# Cloud override\n\nUse *Cloud*.\n');
    // New Boost releases can replace a canonical skill with an app-local link.
    const canonicalSkill = path.join(destination, 'pest-testing');
    fs.rmSync(canonicalSkill, { recursive: true });
    fs.symlinkSync(cloud, canonicalSkill);
    result = invoke();
    assert.equal(result.status, 0, result.stderr);
    assert.ok(!fs.lstatSync(canonicalSkill).isSymbolicLink());
    assert.equal(fs.readFileSync(path.join(destination, 'pest-testing/SKILL.md'), 'utf8'), '# Cloud override\n\nUse _Cloud_.\n');
    for (const provider of ['.claude', '.grok']) {
      assert.equal(fs.readFileSync(path.join(app, provider, 'skills/pest-testing/SKILL.md'), 'utf8'), '# Cloud override\n\nUse _Cloud_.\n');
    }
    const providerCheck = spawnSync(process.execPath, [path.join(app, 'scripts/provider-sync.mjs'), '--root', app, '--check'], { encoding: 'utf8' });
    assert.equal(providerCheck.status, 0, providerCheck.stderr || providerCheck.stdout);
    run(selectedFormatter, [...(toolName === 'vp' ? ['fmt'] : []), '--check', cloud, ...paths], { cwd: app });
    const invalidDirectory = path.join(phpRoot, '.ai/skills/invalid');
    fs.mkdirSync(invalidDirectory);
    const invalidSet = snapshot();
    result = invoke();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /SKILL.md missing/);
    assert.deepEqual(snapshot(), invalidSet);
    fs.rmdirSync(invalidDirectory);
    const broken = path.join(generated, 'broken-skill');
    fs.symlinkSync(path.join(app, 'missing-skill'), broken);
    const brokenSet = snapshot();
    result = invoke();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /dangling or cyclic symlink/);
    assert.deepEqual(snapshot(), brokenSet);
    fs.unlinkSync(broken);
    // Root symlinks are forbidden even though individual skills can be linked.
    fs.renameSync(destination, destination + '.real');
    fs.symlinkSync(destination + '.real', destination);
    const linkedRoot = snapshot();
    result = invoke();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /symlink root or parent/);
    assert.deepEqual(snapshot(), linkedRoot);
    fs.unlinkSync(destination);
    fs.renameSync(destination + '.real', destination);
    // No installed/generated skills must not turn an empty sync into a pass.
    fs.rmSync(destination, { recursive: true });
    if (generated !== destination) fs.rmSync(generated, { recursive: true });
    fs.rmSync(path.join(phpRoot, '.ai'), { recursive: true });
    result = invoke();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /generated skill set is empty/);
    assert.ok(!fs.existsSync(destination));
    console.log(`ok: ${variant} real ${toolName} Boost formatting, same-root sync, nested links, preflight preservation and empty-set rejection`);
  }

  const app = path.join(tmp, 'api-next');
  const bin = path.join(app, 'fixture-bin');
  const schema = path.join(app, 'packages/api-client/openapi.json');
  const types = path.join(app, 'packages/api-client/src/schema.d.ts');
  put(path.join(app, 'services/api/vendor/autoload.php'), '<?php');
  put(path.join(bin, 'php'), `#!/usr/bin/env bash
set -eu
for arg in "$@"; do
  if [[ "$arg" == --path=* ]]; then printf '%s' "$SCHEMA_OUTPUT" > "\${arg#--path=}"; fi
done
`, 0o755);
  put(path.join(app, 'node_modules/.bin/openapi-typescript'), `#!/usr/bin/env bash
set -eu
printf '%s' "$CLIENT_OUTPUT" > "$3"
`, 0o755);
  fs.symlinkSync(formatter, path.join(app, 'node_modules/.bin/oxfmt'));
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, SCHEMA_OUTPUT: '{"openapi":"3.1.0","info":{"title":"Fixture","version":"1"},"paths":{}}', CLIENT_OUTPUT: "export interface paths {'/health':{get:{responses:{200:{content:{'application/json':{ok:boolean}}}}}}}" };
  const generate = (mode, changes = {}) => spawnSync('bash', [path.join(app, 'scripts/generate-api-client.sh'), mode], { cwd: tmp, encoding: 'utf8', env: { ...env, ...changes } });
  const snapshots = () => [fs.readFileSync(schema, 'utf8'), fs.readFileSync(types, 'utf8')];
  let result = generate('--write');
  assert.equal(result.status, 0, result.stderr);
  const written = snapshots();
  assert.notEqual(written[0], env.SCHEMA_OUTPUT);
  assert.notEqual(written[1], env.CLIENT_OUTPUT);
  run(formatter, ['--check', schema, types], { cwd: app });
  result = generate('--check');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(snapshots(), written);
  result = generate('--check', { SCHEMA_OUTPUT: '{"openapi":"3.1.0","paths":{"/changed":{}}}', CLIENT_OUTPUT: 'export interface paths { changed: true }' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /OpenAPI is stale/);
  assert.deepEqual(snapshots(), written);
  result = generate('--check', { CLIENT_OUTPUT: 'export interface paths { changed: true }' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /TypeScript client is stale/);
  assert.deepEqual(snapshots(), written);
  for (const mode of ['--write', '--check']) {
    // A failure formatting the second artifact must preserve both snapshots.
    result = generate(mode, { CLIENT_OUTPUT: 'export interface {' });
    assert.notEqual(result.status, 0);
    assert.deepEqual(snapshots(), written);
    fs.renameSync(path.join(app, 'node_modules/.bin/oxfmt'), path.join(app, 'node_modules/.bin/oxfmt.off'));
    result = generate(mode);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /oxfmt missing/);
    assert.deepEqual(snapshots(), written);
    fs.renameSync(path.join(app, 'node_modules/.bin/oxfmt.off'), path.join(app, 'node_modules/.bin/oxfmt'));
  }
  // Package-local installs work too, with destination-local configuration.
  fs.mkdirSync(path.join(app, 'packages/api-client/node_modules/.bin'), { recursive: true });
  fs.renameSync(path.join(app, 'node_modules/.bin/oxfmt'), path.join(app, 'packages/api-client/node_modules/.bin/oxfmt'));
  put(path.join(app, 'packages/api-client/.oxfmtrc.json'), '{"tabWidth":4}');
  result = generate('--write');
  assert.equal(result.status, 0, result.stderr);
  run(formatter, ['--check', schema, types], { cwd: app });
  assert.equal(generate('--check').status, 0);
  console.log('ok: real formatter/schema fixed point, nested config, stale contracts, missing formatter and error atomicity');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
