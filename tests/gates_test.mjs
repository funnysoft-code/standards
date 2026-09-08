import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createExport, applyExport } from '../scripts/standards-export.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'standards-gates-'));
const failures = [];
function check(name, fn) {
  try { fn(); console.log(`ok: ${name}`); }
  catch (error) { failures.push(name); console.error(`FAIL: ${name}: ${error.message}`); }
}
function put(file, text, mode = 0o644) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, { mode });
}
const tool = `#!/usr/bin/env bash
set -euo pipefail
name="$(basename "$0")"
printf '%s|%s|%s\\n' "$PWD" "$name" "$*" >> "$TRACE"
if [[ -n "\${FAIL_MATCH:-}" && "$name $*" == *"$FAIL_MATCH"* ]]; then exit 37; fi
if [[ "$name" == php && "$*" == *php-coverage-config.php* ]]; then exec "$REAL_PHP" "$@"; fi
if [[ "$name" == php && "$*" == *scramble:export* ]]; then
  [[ "\${FUNNYSOFT_REGISTRATION_ENABLED:-}" == true ]] || { echo 'export must include optional registration' >&2; exit 38; }
  [[ -n "\${APP_CONFIG_CACHE:-}" && -n "\${APP_ROUTES_CACHE:-}" ]] || { echo 'export must isolate caches' >&2; exit 39; }
  [[ ! -e "$APP_CONFIG_CACHE" && ! -e "$APP_ROUTES_CACHE" ]] || exit 40
  [[ "$APP_CONFIG_CACHE" != "$APP_ROUTES_CACHE" ]] || exit 41
  for arg in "$@"; do [[ "$arg" != --path=* ]] || printf '%s' "\${SCHEMA_OUTPUT:-schema}" > "\${arg#--path=}"; done
fi
if [[ "$name" == openapi-typescript ]]; then
  while [[ $# -gt 0 ]]; do if [[ "$1" == -o ]]; then printf '%s' "\${CLIENT_OUTPUT:-client}" > "$2"; break; fi; shift; done
fi
if [[ ( "$name" == oxfmt || "$name" == vp ) && "$*" == *--stdin-filepath* ]]; then cat; fi
`;
const realPhp = spawnSync('which', ['php'], { encoding: 'utf8' }).stdout.trim();
try {
  const bundle = path.join(tmp, 'export');
  createExport({ sourceRoot: root, target: bundle, release: 'v0.0.0-fixture', commit: '0'.repeat(40) });
  for (const variant of ['next-only', 'inertia-monolith', 'api-next']) {
    const app = path.join(tmp, variant + ' with spaces');
    applyExport({ exportRoot: bundle, target: app, variant, team: 'F7T', teamSlug: 'f7t', productBlurb: 'Fixture' });
    const api = variant === 'api-next';
    const phpRoot = api ? path.join(app, 'services/api') : app;
    if (variant !== 'next-only') {
      put(path.join(phpRoot, 'vendor/autoload.php'), '<?php');
      put(path.join(phpRoot, 'artisan'), '<?php');
    }
    const trace = path.join(app, 'trace');
    const bin = path.join(app, 'fixture-bin');
    for (const name of ['php', 'bun', 'bunx']) put(path.join(bin, name), tool, 0o755);
    for (const name of ['oxlint', 'oxfmt', 'tsc', 'vitest', 'react-doctor', 'playwright', 'vp', 'openapi-typescript']) put(path.join(app, 'node_modules/.bin', name), tool, 0o755);
    const jsRoots = api ? ['apps/web', 'packages/api-client', 'packages/design-system'] : ['.'];
    // Incidental folders must never override the stamped stack selection.
    if (variant === 'next-only') fs.mkdirSync(path.join(app, 'resources/js'), { recursive: true });
    for (const jsRoot of jsRoots) {
      put(path.join(app, jsRoot, 'package.json'), '{"devDependencies":{"vitest":"*"}}');
      put(path.join(app, jsRoot, jsRoot.startsWith('packages/') ? 'src/example.ts' : variant === 'inertia-monolith' ? 'resources/js/lib/example.ts' : 'lib/example.ts'), 'export const example = 1;');
    }
    put(path.join(app, 'package.json'), JSON.stringify({ devDependencies: { vitest: '*', ...(variant === 'inertia-monolith' ? { 'vite-plus': '*' } : {}) } }));
    function run(script, gate, env = {}) {
      fs.writeFileSync(trace, '');
      const result = spawnSync('bash', [path.join(app, 'scripts', script), ...(gate ? [gate] : [])], {
        cwd: tmp, encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, TRACE: trace, REAL_PHP: realPhp, ...env },
      });
      return { ...result, trace: fs.readFileSync(trace, 'utf8') };
    }
    check(`${variant}: lint and formatting`, () => {
      const r = run('frontend-gate.sh', 'lint'); assert.equal(r.status, 0, r.stderr);
      assert.match(r.trace, variant === 'inertia-monolith' ? /\|vp\|lint/ : /\|oxlint\|--deny-warnings/);
      assert.match(r.trace, variant === 'inertia-monolith' ? /\|vp\|fmt --check/ : /\|oxfmt\|--check/);
    });
    check(`${variant}: typecheck roots`, () => {
      const r = run('frontend-gate.sh', 'typecheck'); assert.equal(r.status, 0, r.stderr);
      for (const dir of jsRoots) assert.ok(r.trace.includes(`${path.resolve(app, dir)}|tsc|--noEmit`), r.trace);
      if (variant === 'inertia-monolith') {
        assert.match(r.trace, /php\|artisan wayfinder:generate --with-form/);
        assert.match(r.trace, /php\|artisan typescript:transform/);
        assert.equal(run('frontend-gate.sh', 'typecheck', { FAIL_MATCH: 'typescript:transform' }).status, 37);
      }
    });
    check(`${variant}: coverage includes and threshold`, () => {
      const r = run('frontend-gate.sh', 'test'); assert.equal(r.status, 0, r.stderr);
      assert.match(r.trace, /--coverage.thresholds.lines=100/); assert.match(r.trace, /--coverage.include=/);
    });
    check(`${variant}: missing Vitest fails`, () => {
      const file = path.join(app, 'node_modules/.bin/vitest'); fs.renameSync(file, file + '.off');
      try { assert.notEqual(run('frontend-gate.sh', 'test').status, 0); }
      finally { fs.renameSync(file + '.off', file); }
    });
    check(`${variant}: doctor root and failure`, () => {
      const r = run('frontend-gate.sh', 'doctor'); assert.equal(r.status, 0, r.stderr);
      assert.ok(r.trace.includes(`${api ? path.join(app, 'apps/web') : app}|react-doctor|`), r.trace);
      assert.match(r.trace, /--blocking warning/);
      assert.equal(run('frontend-gate.sh', 'doctor', { FAIL_MATCH: 'react-doctor' }).status, 37);
    });
    check(`${variant}: unknown gate`, () => assert.equal(run('frontend-gate.sh', 'unknown').status, 2));
    check(`${variant}: V2 MCP`, () => {
      const c = JSON.parse(fs.readFileSync(path.join(app, 'opencode.json')));
      assert.ok(c.mcp.servers.mobbin);
      for (const server of Object.values(c.mcp.servers)) assert.ok(!('enabled' in server));
      assert.equal(Boolean(c.mcp.servers['laravel-boost']), variant !== 'next-only');
    });
    check(`${variant}: workflow YAML, pinned actions, hook boundary`, () => {
      const hooks = fs.readFileSync(path.join(app, 'lefthook.yml'), 'utf8');
      assert.doesNotMatch(hooks.replace(/^#.*$/gm, ''), /playwright|frontend-gate.sh e2e/i);
      const workflow = path.join(app, '.github/workflows/quality.yml');
      const parsed = spawnSync('bun', ['-e', 'console.log(JSON.stringify(Bun.YAML.parse(await Bun.file(process.argv[1]).text())))', workflow], { encoding: 'utf8' });
      assert.equal(parsed.status, 0, parsed.stderr);
      const value = JSON.parse(parsed.stdout);
      for (const job of Object.values(value.jobs)) {
        assert.match(job['runs-on'], /^blacksmith-\d+vcpu-ubuntu-2404-arm$/);
        for (const step of job.steps) if (step.uses) assert.match(step.uses, /@[a-f0-9]{40}$/);
      }
      assert.equal(Boolean(value.jobs['php-gate']), variant !== 'next-only');
      assert.match(fs.readFileSync(workflow, 'utf8'), /E2E_MODE: stub/);
      if (api) assert.match(hooks, /services\/api\/\*\*/);
      for (const name of fs.readdirSync(path.dirname(workflow)).filter((name) => name.startsWith('deploy-'))) {
        const parsedDeploy = spawnSync('bun', ['-e', 'console.log(JSON.stringify(Bun.YAML.parse(await Bun.file(process.argv[1]).text())))', path.join(path.dirname(workflow), name)], { encoding: 'utf8' });
        assert.equal(parsedDeploy.status, 0, parsedDeploy.stderr);
        const deploy = JSON.parse(parsedDeploy.stdout);
        assert.equal(deploy.jobs.deploy.needs, 'quality');
        assert.equal(deploy.concurrency['cancel-in-progress'], false);
        assert.ok(deploy.jobs.deploy.steps.some((step) => step.name === 'Report unconfigured deployment'));
      }
    });
    if (variant === 'next-only') continue;
    for (const name of ['pint', 'phpstan', 'rector', 'pest']) put(path.join(phpRoot, 'vendor/bin', name), tool, 0o755);
    put(path.join(phpRoot, 'vendor/autoload.php'), '<?php'); put(path.join(phpRoot, 'artisan'), '<?php');
    put(path.join(phpRoot, 'phpunit.xml'), '<phpunit bootstrap="vendor/autoload.php"><testsuites><testsuite name="Unit"><directory>tests</directory></testsuite></testsuites><source><include><directory>app</directory></include></source></phpunit>');
    put(path.join(phpRoot, api ? 'Modules/Identity/Actions/Example.php' : 'app/Actions/Example.php'), '<?php');
    put(path.join(phpRoot, 'app/Http/Controllers/Example.php'), '<?php');
    check(`${variant}: PHP roots and both coverage bars`, () => {
      const r = run('php-gate.sh', 'all'); assert.equal(r.status, 0, r.stderr);
      assert.match(r.trace, /--type-coverage --min=100/); assert.match(r.trace, /--coverage --min=100/);
      for (const line of r.trace.trim().split('\n')) assert.equal(line.split('|')[0], phpRoot);
      assert.equal(run('php-gate.sh', 'pest', { FAIL_MATCH: '--type-coverage' }).status, 37);
      assert.ok(!fs.readdirSync(phpRoot).some((file) => file.startsWith('.phpunit-quality.')));
    });
    check(`${variant}: real coverage XML source selection`, () => {
      put(path.join(phpRoot, 'app/Providers/Example.php'), '<?php');
      put(path.join(phpRoot, 'routes/web.php'), '<?php');
      if (api) put(path.join(phpRoot, 'Modules/Identity/Console/ProvisionUser.php'), '<?php');
      const output = path.join(phpRoot, 'fixture-coverage.xml');
      const r = spawnSync(realPhp, [path.join(app, 'scripts/php-coverage-config.php'), output, api ? 'services/api' : '.'], { cwd: phpRoot, encoding: 'utf8' });
      assert.equal(r.status, 0, r.stderr);
      const xml = fs.readFileSync(output, 'utf8');
      assert.match(xml, /bootstrap="vendor\/autoload.php"/);
      assert.match(xml, /<testsuite name="Unit">/);
      assert.match(xml, /app\/Http/);
      assert.doesNotMatch(xml, /app\/Providers|routes|<directory>app<\/directory>/);
      if (api) { assert.match(xml, /Modules\/Identity\/Actions/); assert.match(xml, /Modules\/Identity\/Console/); }
    });
    check(`${variant}: missing Composer tools fail`, () => {
      const file = path.join(phpRoot, 'vendor/bin/pint'); fs.renameSync(file, file + '.off');
      try { assert.notEqual(run('php-gate.sh', 'pint').status, 0); }
      finally { fs.renameSync(file + '.off', file); }
    });
    if (!api) check('inertia-monolith: Boost already uses root, no Cloud tree', () => {
      put(path.join(app, '.opencode/skills/pest-testing/SKILL.md'), 'Pest skill\n');
      assert.ok(!fs.existsSync(path.join(app, '.ai')));
      const r = run('boost-sync-opencode-skills.sh');
      assert.equal(r.status, 0, r.stderr);
      assert.equal(fs.readFileSync(path.join(app, '.opencode/skills/pest-testing/SKILL.md'), 'utf8'), 'Pest skill\n');
    });
    check(`${variant}: Boost real root files, repeatable, brief preserved`, () => {
      put(path.join(app, 'AGENTS.md'), 'Short product brief\n');
      put(path.join(phpRoot, '.ai/skills/cloud-deploy/SKILL.md'), 'Cloud skill\n');
      fs.symlinkSync(path.join(phpRoot, '.ai/skills/cloud-deploy'), path.join(app, '.opencode/skills/cloud-deploy'));
      const r = run('boost-sync-opencode-skills.sh'); assert.equal(r.status, 0, r.stderr);
      assert.equal(fs.lstatSync(path.join(app, '.opencode/skills/cloud-deploy')).isSymbolicLink(), false);
      assert.equal(fs.readFileSync(path.join(app, '.opencode/skills/cloud-deploy/SKILL.md'), 'utf8'), 'Cloud skill\n');
      assert.equal(fs.readFileSync(path.join(app, 'AGENTS.md'), 'utf8'), 'Short product brief\n');
      assert.ok(fs.existsSync(path.join(app, '.opencode/skills/grilling/SKILL.md')));
      assert.equal(run('boost-sync-opencode-skills.sh').status, 0);
    });
    check(`${variant}: Boost missing formatter, error propagation and vp fallback`, () => {
      const tools = ['oxfmt', 'vp'].map((name) => path.join(app, 'node_modules/.bin', name));
      const skill = path.join(app, '.opencode/skills/cloud-deploy/SKILL.md');
      const before = fs.readFileSync(skill);
      for (const file of tools) fs.renameSync(file, file + '.off');
      try {
        const missing = run('boost-sync-opencode-skills.sh');
        assert.notEqual(missing.status, 0);
        assert.match(missing.stderr, /formatter missing/);
        assert.deepEqual(fs.readFileSync(skill), before);
      } finally { for (const file of tools) fs.renameSync(file + '.off', file); }
      assert.equal(run('boost-sync-opencode-skills.sh', '', { FAIL_MATCH: 'oxfmt' }).status, 37);
      assert.deepEqual(fs.readFileSync(skill), before);
      fs.renameSync(tools[0], tools[0] + '.off');
      try {
        const r = run('boost-sync-opencode-skills.sh');
        assert.equal(r.status, 0, r.stderr);
        assert.match(r.trace, /\|vp\|fmt --stdin-filepath/);
      } finally { fs.renameSync(tools[0] + '.off', tools[0]); }
    });
    check(`${variant}: invalid Boost skill fails before replacement`, () => {
      const invalid = path.join(phpRoot, '.ai/skills/invalid');
      fs.mkdirSync(invalid);
      try {
        assert.notEqual(run('boost-sync-opencode-skills.sh').status, 0);
        assert.equal(fs.readFileSync(path.join(app, '.opencode/skills/cloud-deploy/SKILL.md'), 'utf8'), 'Cloud skill\n');
      } finally { fs.rmSync(invalid, { recursive: true }); }
    });
    if (!api) continue;
    check('api-next: generated app skills also reach root', () => {
      put(path.join(phpRoot, '.opencode/skills/pest-testing/SKILL.md'), 'Pest skill\n');
      assert.equal(run('boost-sync-opencode-skills.sh').status, 0);
      assert.equal(fs.readFileSync(path.join(app, '.opencode/skills/pest-testing/SKILL.md'), 'utf8'), 'Pest skill\n');
    });
    check('api-next: real workflow registry parser', () => {
      const registry = path.join(app, 'tests/workflows.yml');
      const spec = path.join(app, 'e2e/account.spec.ts');
      const invoke = () => spawnSync('bun', [path.join(app, 'scripts/check-workflows.mjs')], { cwd: tmp, encoding: 'utf8' });
      assert.notEqual(invoke().status, 0);
      put(registry, 'workflows:\n  - id: login\n    tag: "@login"\n');
      put(spec, 'test("@login user can sign in", () => {});');
      assert.equal(invoke().status, 0);
      put(spec, 'test("@login-other", () => {});');
      assert.notEqual(invoke().status, 0);
      put(registry, 'workflows: []\n'); assert.notEqual(invoke().status, 0);
      put(registry, 'workflows:\n  - id: login\n    tag: "@login"\n  - id: login\n    tag: "@login"\n');
      assert.notEqual(invoke().status, 0);
    });
    put(path.join(app, 'packages/api-client/openapi.json'), 'schema');
    put(path.join(app, 'packages/api-client/src/schema.d.ts'), 'client');
    check('api-next: full schema chain, no artifact mutation', () => {
      const r = run('frontend-gate.sh', 'schema'); assert.equal(r.status, 0, r.stderr);
      assert.ok(r.trace.includes(`${phpRoot}|php|artisan scramble:export`), r.trace);
      assert.match(r.trace, /\|openapi-typescript\|/);
      assert.match(r.trace, /\|oxfmt\|--stdin-filepath packages\/api-client\/openapi.json/);
      assert.match(r.trace, /\|oxfmt\|--stdin-filepath packages\/api-client\/src\/schema.d.ts/);
      assert.notEqual(run('frontend-gate.sh', 'schema', { SCHEMA_OUTPUT: 'changed backend' }).status, 0);
      assert.notEqual(run('frontend-gate.sh', 'schema', { CLIENT_OUTPUT: 'changed client' }).status, 0);
      assert.equal(run('frontend-gate.sh', 'schema', { FAIL_MATCH: 'scramble:export' }).status, 37);
      for (const mode of ['--check', '--write']) {
        assert.equal(run('generate-api-client.sh', mode, { FAIL_MATCH: 'oxfmt --stdin-filepath packages/api-client/src/schema.d.ts' }).status, 37);
        const formatter = path.join(app, 'node_modules/.bin/oxfmt');
        fs.renameSync(formatter, formatter + '.off');
        try {
          const missing = run('generate-api-client.sh', mode);
          assert.notEqual(missing.status, 0);
          assert.match(missing.stderr, /oxfmt missing/);
          assert.equal(missing.trace, '');
        } finally { fs.renameSync(formatter + '.off', formatter); }
      }
      assert.equal(fs.readFileSync(path.join(app, 'packages/api-client/openapi.json'), 'utf8'), 'schema');
      assert.equal(fs.readFileSync(path.join(app, 'packages/api-client/src/schema.d.ts'), 'utf8'), 'client');
      assert.equal(run('generate-api-client.sh', '--write', { SCHEMA_OUTPUT: 'new schema', CLIENT_OUTPUT: 'new client' }).status, 0);
      assert.equal(fs.readFileSync(path.join(app, 'packages/api-client/openapi.json'), 'utf8'), 'new schema');
      assert.equal(fs.readFileSync(path.join(app, 'packages/api-client/src/schema.d.ts'), 'utf8'), 'new client');
    });
  }
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
if (failures.length) { console.error(`${failures.length} gate fixtures failed`); process.exitCode = 1; }
