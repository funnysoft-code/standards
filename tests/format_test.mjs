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
  assert.equal(result.status, 0, result.stderr || result.stdout);
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
    const linear = fs.readFileSync(path.join(app, '.opencode/skills/linear/SKILL.md'), 'utf8');
    assert.ok(linear.includes('A `F7T` blocker'));
    assert.ok(linear.includes('(`F7T-nnn`)'));
    assert.doesNotMatch(linear, /__TEAM__|\*\*TEAM\*\*/);
    console.log(`ok: ${variant} formatted assets, receipt semantics, dependency-free stamp parity`);
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
