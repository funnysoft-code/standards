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
function treeSnapshot(directory, relative = '') {
  return fs.readdirSync(path.join(directory, relative), { withFileTypes: true })
    .filter((entry) => !(relative === '' && entry.name === 'trace'))
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const name = path.join(relative, entry.name);
      const file = path.join(directory, name);
      const stat = fs.lstatSync(file);
      if (stat.isDirectory()) return [[name, 'directory'], ...treeSnapshot(directory, name)];
      if (stat.isSymbolicLink()) return [[name, `link:${fs.readlinkSync(file)}`]];
      if (stat.isFile()) return [[name, `file:${fs.readFileSync(file, 'base64')}`]];
      return [[name, `special:${stat.mode}`]];
    });
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
const playwright = process.argv[2];
assert.ok(playwright && fs.existsSync(path.join(playwright, 'cli.js')), 'pass an installed @playwright/test package directory as argument');
// Evaluate only the condition vocabulary used by these quality jobs. Unknown
// expressions must fail rather than silently skipping a prerequisite.
function selected(condition, gate, hasConfig = true) {
  if (!condition) return true;
  if (condition === "hashFiles('playwright.config.*') != ''") return hasConfig;
  const expression = condition.replace(/matrix\.gate/g, JSON.stringify(gate));
  assert.match(expression, /^[\s'"a-zA-Z0-9/._=!&|()]+$/);
  return Function(`return (${expression});`)();
}
function workflowFixture(job, app, gate, { omit = '', example = true, hasConfig = true } = {}) {
  const checkout = fs.mkdtempSync(path.join(tmp, 'clean-checkout-'));
  // Only declared checkout inputs, never a generated ignored .env or browser cache.
  for (const file of ['STANDARDS_MANIFEST.json', 'scripts/frontend-gate.sh']) {
    put(path.join(checkout, file), fs.readFileSync(path.join(app, file)), 0o755);
  }
  put(path.join(checkout, 'package.json'), '{"devDependencies":{"vitest":"*"}}');
  put(path.join(checkout, 'lib/example.ts'), 'export const example = 1;');
  if (example) put(path.join(checkout, '.env.example'), 'NEXT_PUBLIC_SITE_URL=http://localhost:3000\n');
  const bin = path.join(checkout, 'bin');
  const trace = path.join(checkout, 'trace');
  put(trace, '');
  const stub = `#!/usr/bin/env bash
set -euo pipefail
name="$(basename "$0")"
printf '%s|%s|%s\\n' "$PWD" "$name" "$*" >> "$TRACE"
if [[ "$name" == playwright && "$1" == install ]]; then
  mkdir -p "$PLAYWRIGHT_BROWSERS_PATH"
  touch "$PLAYWRIGHT_BROWSERS_PATH/chromium"
elif [[ "$name" == vitest || ( "$name" == playwright && "$1" == test ) ]]; then
  [[ -f "$PLAYWRIGHT_BROWSERS_PATH/chromium" ]] || { echo 'Chromium executable missing' >&2; exit 43; }
elif [[ "$name $*" == 'bun run build' && "$STACK" == next-only ]]; then
  node --env-file=.env -e 'new URL(process.env.NEXT_PUBLIC_SITE_URL)'
fi
`;
  for (const name of ['bun']) put(path.join(bin, name), stub, 0o755);
  for (const name of ['playwright', 'vitest']) put(path.join(checkout, 'node_modules/.bin', name), stub, 0o755);
  const env = { ...process.env, ...job.env, CI: 'true', PATH: `${bin}:${process.env.PATH}`,
    TRACE: trace, STACK: JSON.parse(fs.readFileSync(path.join(checkout, 'STANDARDS_MANIFEST.json'))).variant,
    PLAYWRIGHT_BROWSERS_PATH: path.join(checkout, 'empty-browser-cache') };
  delete env.NEXT_PUBLIC_SITE_URL;
  delete env.F7T_CHROMIUM_EXECUTABLE;
  delete env.SKIP_ENV_VALIDATION;
  let result = { status: 0, stderr: '' };
  for (const step of job.steps) {
    // Composer/services and action setup are outside this JS prerequisite fixture.
    if (!step.run || !/playwright install|bun run build|frontend-gate\.sh \$\{\{ matrix.gate \}\}|cp \.env.example/.test(step.run)) continue;
    if (step.name === 'Prepare Laravel' || !selected(step.if, gate, hasConfig)) continue;
    let command = step.run.replaceAll('${{ matrix.gate }}', gate);
    if (omit) command = command.split('\n').filter((line) => !line.includes(omit)).join('\n');
    result = spawnSync('bash', ['-e', '-o', 'pipefail', '-c', command], {
      cwd: path.resolve(checkout, step['working-directory'] || '.'), encoding: 'utf8', env,
    });
    if (result.status !== 0) break;
  }
  return { ...result, trace: fs.readFileSync(trace, 'utf8'), checkout };
}
try {
  const bundle = path.join(tmp, 'export');
  const exportManifest = createExport({ sourceRoot: root, target: bundle, release: 'v0.0.0-fixture', commit: '0'.repeat(40) });
  for (const variant of ['next-only', 'inertia-monolith', 'api-next']) {
    const app = path.join(tmp, variant + ' with spaces');
    applyExport({ exportRoot: bundle, target: app, variant, team: 'F7T', teamSlug: 'f7t', productBlurb: 'Fixture', expectedDigest: exportManifest.assetDigest });
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
    check(`${variant}: V1 and V2 compatible MCP`, () => {
      const c = JSON.parse(fs.readFileSync(path.join(app, 'opencode.json')));
      assert.ok(c.mcp.mobbin);
      assert.ok(!c.mcp.servers);
      assert.equal(Boolean(c.mcp['laravel-boost']), variant !== 'next-only');
    });
    check(`${variant}: shared rule names the applicable pinned quality gate`, () => {
      const rule = fs.readFileSync(path.join(app, '.agents/rules/ponytail.md'), 'utf8');
      assert.match(rule, /docs\/playbook\/quality.md/);
      assert.doesNotMatch(rule, /Pest and `scripts\/php-gate.sh`/);
    });
    check(`${variant}: clean checkout browser prerequisites`, () => {
      const parsed = spawnSync('bun', ['-e', 'console.log(JSON.stringify(Bun.YAML.parse(await Bun.file(process.argv[1]).text())))', path.join(app, '.github/workflows/quality.yml')], { encoding: 'utf8' });
      assert.equal(parsed.status, 0, parsed.stderr);
      const jobs = JSON.parse(parsed.stdout).jobs;
      if (variant === 'next-only') {
        const job = jobs.browser;
        assert.equal(job.env.E2E_MODE, 'stub');
        const good = workflowFixture(job, app, 'e2e');
        assert.equal(good.status, 0, good.stderr);
        assert.match(good.trace, /bun\|run build/);
        assert.match(good.trace, /playwright\|test/);
        assert.equal(fs.readFileSync(path.join(good.checkout, '.env'), 'utf8'), 'NEXT_PUBLIC_SITE_URL=http://localhost:3000\n');
        assert.notEqual(workflowFixture(job, app, 'e2e', { omit: 'cp .env.example' }).status, 0);
        const missing = workflowFixture(job, app, 'e2e', { example: false });
        assert.notEqual(missing.status, 0);
        assert.doesNotMatch(missing.trace, /bun\|run build|playwright\|test/);
        const disabled = workflowFixture(job, app, 'e2e', { hasConfig: false });
        assert.equal(disabled.status, 0, disabled.stderr);
        assert.equal(disabled.trace, '');
      } else {
        const job = jobs['frontend-gate'];
        assert.equal(job.env.E2E_MODE, 'stub');
        const install = job.steps.find((step) => step.run?.includes('playwright install'));
        for (const gate of job.strategy.matrix.gate) {
          assert.equal(selected(install.if, gate), gate === 'e2e' || (api && gate === 'test'), `${variant}/${gate}: browser installation selection`);
        }
        for (const gate of api ? ['test', 'e2e'] : ['e2e']) {
          const good = workflowFixture(job, app, gate);
          assert.equal(good.status, 0, good.stderr);
          assert.match(good.trace, /playwright\|install --with-deps chromium/);
          if (gate === 'test') assert.doesNotMatch(good.trace, /bun\|run build/);
          else assert.match(good.trace, /bun\|run build/);
          const missing = workflowFixture(job, app, gate, { omit: 'playwright install' });
          assert.notEqual(missing.status, 0);
          assert.match(missing.stderr, /Chromium executable missing/);
        }
      }
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
        assert.equal(deploy.jobs.deploy.if, "github.ref == 'refs/heads/main'");
        assert.deepEqual(Object.keys(deploy.on), ['workflow_dispatch']);
        const text = JSON.stringify(deploy);
        if (name === 'deploy-cloud.yml') {
          const step = deploy.jobs.deploy.steps.find((step) => step.name === 'Request Cloud deployment of the checked revision');
          assert.ok(step, 'Cloud must offer a revision-bound deploy hook');
          assert.equal(step.env.CHECKED_SHA, '${{ github.sha }}');
          assert.equal(step.env.DEPLOY_HOOK_URL, '${{ secrets.LARAVEL_CLOUD_DEPLOY_HOOK_URL }}');
          const deployBin = path.join(app, 'cloud-fixture-bin');
          put(path.join(deployBin, 'curl'), `#!/usr/bin/env bash
set -eu
printf '%s\\n' "$@" >> "$TRACE"
printf '%s' "\${HTTP_STATUS:-202}"
exit "\${CURL_EXIT:-0}"
`, 0o755);
          const hook = 'https://cloud.laravel.com/deploy-hooks/fixture-token';
          const invoke = (changes = {}) => {
            fs.writeFileSync(trace, '');
            return spawnSync('bash', ['-c', step.run], { cwd: app, encoding: 'utf8', env: {
              ...process.env, PATH: `${deployBin}:${process.env.PATH}`, TRACE: trace,
              CHECKED_SHA: 'a'.repeat(40), MOVING_MAIN_SHA: 'b'.repeat(40), DEPLOY_HOOK_URL: hook, ...changes,
            } });
          };
          const success = invoke();
          assert.equal(success.status, 0, success.stderr);
          const calls = fs.readFileSync(trace, 'utf8').trim().split('\n');
          assert.ok(calls.includes(`${hook}?commit_hash=${'a'.repeat(40)}`));
          assert.equal(calls[calls.indexOf('--request') + 1], 'POST');
          assert.equal(calls[0], '--disable');
          assert.ok(!calls.includes('--location'));
          assert.doesNotMatch(calls.join('\n'), /b{40}/);
          assert.doesNotMatch(success.stdout + success.stderr, /fixture-token|success|complete/i);
          for (const changes of [
            { CHECKED_SHA: '' }, { CHECKED_SHA: 'abc123' }, { CHECKED_SHA: 'g'.repeat(40) },
            { DEPLOY_HOOK_URL: '' }, { DEPLOY_HOOK_URL: 'http://cloud.laravel.com/hook' },
            { DEPLOY_HOOK_URL: hook + '?commit_hash=other' }, { DEPLOY_HOOK_URL: hook + '#fragment' },
          ]) {
            assert.notEqual(invoke(changes).status, 0);
            assert.equal(fs.readFileSync(trace, 'utf8'), '', 'invalid input must fail before the hook');
          }
          for (const changes of [{ CURL_EXIT: '6' }, { CURL_EXIT: '28' }, { HTTP_STATUS: '302' }, { HTTP_STATUS: '422' }, { HTTP_STATUS: '500' }]) {
            const failed = invoke(changes);
            assert.notEqual(failed.status, 0);
            assert.doesNotMatch(failed.stdout + failed.stderr, /fixture-token|success|complete/i);
          }
        } else {
          assert.doesNotMatch(text, /DEPLOY_HOOK_URL/);
          assert.ok(deploy.jobs.deploy.steps.some((step) => step.with?.ref === '${{ github.sha }}'));
          assert.match(text, /build --prod/);
          assert.match(text, /deploy --prebuilt --prod --skip-domain/);
          assert.match(text, /promote/);
          const steps = deploy.jobs.deploy.steps.filter((step) => step.run && step.name !== 'Report unconfigured deployment');
          const deployBin = path.join(app, 'deploy-fixture-bin');
          for (const command of ['npm', 'bun', 'git', 'vercel']) put(path.join(deployBin, command), `#!/usr/bin/env bash
set -eu
name="$(basename "$0")"
printf '%s %s\\n' "$name" "$*" >> "$TRACE"
if [[ "$name" == git ]]; then printf '%s\\n' "$CHECKOUT_SHA"; fi
if [[ "$name" == npm || "$name" == bun || ( "$name" == vercel && "$1" == build ) ]]; then
  [[ -z "\${VERCEL_TOKEN:-}" ]] || { echo 'deployment authority exposed to install/build' >&2; exit 20; }
fi
if [[ "$name" == vercel && "$1" != build ]]; then
  [[ -n "\${VERCEL_TOKEN:-}" ]] || { echo 'provider operation needs credentials' >&2; exit 21; }
fi
if [[ "$name" == vercel && "$1" == pull && "\${FAIL_PULL:-}" == true ]]; then exit 18; fi
if [[ "$name" == vercel && "$1" == build && "\${FAIL_BUILD:-}" == true ]]; then exit 17; fi
if [[ "$name" == vercel && "$1" == deploy ]]; then
  [[ "\${FAIL_UPLOAD:-}" != true ]] || exit 19
  printf '%s\\n' "\${DEPLOYMENT_URL:-https://checked-artifact.vercel.app}"
fi
`, 0o755);
          const invoke = (changes = {}) => {
            fs.writeFileSync(trace, '');
            const values = { CHECKED_SHA: 'a'.repeat(40), VERCEL_TOKEN: 'fixture', VERCEL_ORG_ID: 'existing-org', VERCEL_PROJECT_ID: 'existing-project', VERCEL_CLI_VERSION: '59.12.0', ...changes };
            const resolveEnv = (env = {}) => Object.fromEntries(Object.keys(env).map((key) => [key, values[key]]));
            const base = { ...process.env, PATH: `${deployBin}:${process.env.PATH}`, TRACE: trace,
              CHECKOUT_SHA: 'a'.repeat(40), MOVING_MAIN_SHA: 'b'.repeat(40), ...changes };
            delete base.VERCEL_TOKEN;
            let result;
            for (const step of steps) {
              result = spawnSync('bash', ['-c', step.run], { cwd: app, encoding: 'utf8', env: {
                ...base, ...resolveEnv(deploy.jobs.deploy.env), ...resolveEnv(step.env),
              } });
              if (result.status !== 0) break;
            }
            return result;
          };
          const success = invoke();
          assert.equal(success.status, 0, success.stderr);
          const calls = fs.readFileSync(trace, 'utf8');
          assert.match(calls, /deploy --prebuilt --prod --skip-domain --yes --meta githubCommitSha=a{40}/);
          assert.match(calls, /promote https:\/\/checked-artifact.vercel.app --yes/);
          assert.ok(calls.indexOf('bun install') < calls.indexOf('vercel pull'));
          assert.ok(calls.indexOf('vercel pull') < calls.indexOf('vercel build'));
          assert.doesNotMatch(calls, /b{40}/);
          for (const changes of [{ CHECKOUT_SHA: 'b'.repeat(40) }, { VERCEL_PROJECT_ID: '' }, { VERCEL_TOKEN: '' }, { VERCEL_CLI_VERSION: 'latest' }, { FAIL_PULL: 'true' }, { FAIL_BUILD: 'true' }, { FAIL_UPLOAD: 'true' }, { DEPLOYMENT_URL: 'https://unexpected.example.com' }]) {
            assert.notEqual(invoke(changes).status, 0);
            assert.doesNotMatch(fs.readFileSync(trace, 'utf8'), /vercel promote/);
          }
        }
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
    check(`${variant}: coverage enables assertions before loading Pest`, () => {
      const r = run('php-gate.sh', 'pest'); assert.equal(r.status, 0, r.stderr);
      const coverage = r.trace.trim().split('\n').filter((line) => line.includes(' --coverage '));
      assert.equal(coverage.length, 1, r.trace);
      assert.ok(coverage[0].startsWith(`${phpRoot}|php|-d zend.assertions=1 -d pcov.directory=${phpRoot} -d pcov.initial.files=4096 vendor/bin/pest `), coverage[0]);
      assert.match(coverage[0], / --coverage --min=100$/);
      assert.equal(run('php-gate.sh', 'pest', { FAIL_MATCH: '--coverage' }).status, 37);
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
      put(path.join(app, '.agents/skills/pest-testing/SKILL.md'), 'Pest skill\n');
      assert.ok(!fs.existsSync(path.join(app, '.ai')));
      const r = run('boost-sync-opencode-skills.sh');
      assert.equal(r.status, 0, r.stderr);
      assert.equal(fs.readFileSync(path.join(app, '.agents/skills/pest-testing/SKILL.md'), 'utf8'), 'Pest skill\n');
    });
    check(`${variant}: Boost real root files, repeatable, brief preserved`, () => {
      put(path.join(app, 'AGENTS.md'), 'Short product brief\n');
      put(path.join(phpRoot, '.ai/skills/cloud-deploy/SKILL.md'), 'Cloud skill\n');
      fs.symlinkSync(path.join(phpRoot, '.ai/skills/cloud-deploy'), path.join(app, '.agents/skills/cloud-deploy'));
      const r = run('boost-sync-opencode-skills.sh'); assert.equal(r.status, 0, r.stderr);
      assert.equal(fs.lstatSync(path.join(app, '.agents/skills/cloud-deploy')).isSymbolicLink(), false);
      assert.equal(fs.readFileSync(path.join(app, '.agents/skills/cloud-deploy/SKILL.md'), 'utf8'), 'Cloud skill\n');
      assert.ok(fs.readFileSync(path.join(app, 'AGENTS.md'), 'utf8').startsWith('Short product brief\n'));
      assert.ok(fs.existsSync(path.join(app, '.agents/skills/grilling/SKILL.md')));
      assert.equal(run('boost-sync-opencode-skills.sh').status, 0);
    });
    check(`${variant}: Boost missing formatter, preferred formatter failure and fallback`, () => {
      const tools = ['oxfmt', 'vp'].map((name) => path.join(app, 'node_modules/.bin', name));
      const skill = path.join(app, '.agents/skills/cloud-deploy/SKILL.md');
      const before = fs.readFileSync(skill);
      for (const file of tools) fs.renameSync(file, file + '.off');
      try {
        const missing = run('boost-sync-opencode-skills.sh');
        assert.notEqual(missing.status, 0);
        assert.match(missing.stderr, /formatter missing/);
        assert.deepEqual(fs.readFileSync(skill), before);
      } finally { for (const file of tools) fs.renameSync(file + '.off', file); }
      assert.equal(run('boost-sync-opencode-skills.sh', '', { FAIL_MATCH: 'vp' }).status, 37);
      assert.deepEqual(fs.readFileSync(skill), before);
      fs.renameSync(tools[1], tools[1] + '.off');
      try {
        const r = run('boost-sync-opencode-skills.sh');
        assert.equal(r.status, 0, r.stderr);
        assert.match(r.trace, /\|oxfmt\|--stdin-filepath/);
      } finally { fs.renameSync(tools[1] + '.off', tools[1]); }
    });
    check(`${variant}: invalid Boost skill fails before replacement`, () => {
      const invalid = path.join(phpRoot, '.ai/skills/invalid');
      fs.mkdirSync(invalid);
      try {
        assert.notEqual(run('boost-sync-opencode-skills.sh').status, 0);
        assert.equal(fs.readFileSync(path.join(app, '.agents/skills/cloud-deploy/SKILL.md'), 'utf8'), 'Cloud skill\n');
      } finally { fs.rmSync(invalid, { recursive: true }); }
    });
    if (!api) continue;
    check('api-next: generated app skills also reach root', () => {
      put(path.join(phpRoot, '.agents/skills/pest-testing/SKILL.md'), 'Pest skill\n');
      assert.equal(run('boost-sync-opencode-skills.sh').status, 0);
      assert.equal(fs.readFileSync(path.join(app, '.agents/skills/pest-testing/SKILL.md'), 'utf8'), 'Pest skill\n');
    });
    check('api-next: managed Boost skills update and delete without touching custom skills', () => {
      const generatedSkill = path.join(phpRoot, '.agents/skills/managed-fixture');
      const localSkill = path.join(phpRoot, '.ai/skills/managed-fixture');
      const materialized = path.join(app, '.agents/skills/managed-fixture');
      const custom = path.join(app, '.agents/skills/custom-fixture/SKILL.md');
      put(custom, 'Custom skill\n');
      put(path.join(generatedSkill, 'SKILL.md'), 'Generated v1\n');
      let r = run('boost-sync-opencode-skills.sh');
      assert.equal(r.status, 0, r.stderr);
      assert.equal(fs.readFileSync(path.join(materialized, 'SKILL.md'), 'utf8'), 'Generated v1\n');
      assert.equal(fs.readFileSync(custom, 'utf8'), 'Custom skill\n');

      put(path.join(generatedSkill, 'SKILL.md'), 'Generated v2\n');
      put(path.join(localSkill, 'SKILL.md'), 'App-local v2\n');
      r = run('boost-sync-opencode-skills.sh');
      assert.equal(r.status, 0, r.stderr);
      assert.equal(fs.readFileSync(path.join(materialized, 'SKILL.md'), 'utf8'), 'App-local v2\n');

      fs.rmSync(generatedSkill, { recursive: true });
      fs.rmSync(localSkill, { recursive: true });
      r = run('boost-sync-opencode-skills.sh');
      assert.equal(r.status, 0, r.stderr);
      assert.equal(fs.existsSync(materialized), false);
      assert.equal(fs.readFileSync(custom, 'utf8'), 'Custom skill\n');
    });
    check('api-next: edited managed Boost destination refuses replacement', () => {
      const generatedSkill = path.join(phpRoot, '.agents/skills/guarded-fixture/SKILL.md');
      const materialized = path.join(app, '.agents/skills/guarded-fixture/SKILL.md');
      put(generatedSkill, 'Managed v1\n');
      assert.equal(run('boost-sync-opencode-skills.sh').status, 0);
      put(materialized, 'Custom edit\n');
      put(generatedSkill, 'Managed v2\n');
      const r = run('boost-sync-opencode-skills.sh');
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /edited managed destination refuses replacement/);
      assert.equal(fs.readFileSync(materialized, 'utf8'), 'Custom edit\n');
      assert.equal(fs.readFileSync(generatedSkill, 'utf8'), 'Managed v2\n');
      put(materialized, 'Managed v1\n');
      assert.equal(run('boost-sync-opencode-skills.sh').status, 0);
      assert.equal(fs.readFileSync(materialized, 'utf8'), 'Managed v2\n');
    });
    check('api-next: interrupted receipt publication recovers exact desired output', () => {
      const generatedSkill = path.join(phpRoot, '.agents/skills/recovery-fixture/SKILL.md');
      const materialized = path.join(app, '.agents/skills/recovery-fixture/SKILL.md');
      const receipt = path.join(app, '.agents/boost-sync-receipt.json');
      put(generatedSkill, 'Recovery v1\n');
      assert.equal(run('boost-sync-opencode-skills.sh').status, 0);
      const receiptV1 = fs.readFileSync(receipt);

      put(generatedSkill, 'Recovery v2\n');
      const realMktemp = spawnSync('which', ['mktemp'], { encoding: 'utf8' }).stdout.trim();
      assert.ok(realMktemp);
      const mktemp = path.join(bin, 'mktemp');
      put(mktemp, `#!/usr/bin/env bash
if [[ "$1" == */.agents/.boost-sync-receipt.* ]]; then exit 73; fi
exec "${realMktemp}" "$@"
`, 0o755);
      let interrupted;
      try { interrupted = run('boost-sync-opencode-skills.sh'); }
      finally { fs.rmSync(mktemp); }
      assert.equal(interrupted.status, 73, interrupted.stderr);
      assert.equal(fs.readFileSync(materialized, 'utf8'), 'Recovery v2\n');
      assert.deepEqual(fs.readFileSync(receipt), receiptV1);
      assert.doesNotThrow(() => JSON.parse(fs.readFileSync(receipt, 'utf8')));

      const recovered = run('boost-sync-opencode-skills.sh');
      assert.equal(recovered.status, 0, recovered.stderr);
      assert.equal(fs.readFileSync(materialized, 'utf8'), 'Recovery v2\n');
      assert.notDeepEqual(fs.readFileSync(receipt), receiptV1);
    });
    check('api-next: unowned Boost destination collision refuses first materialization', () => {
      const generatedSkill = path.join(phpRoot, '.agents/skills/collision-fixture/SKILL.md');
      const destinationSkill = path.join(app, '.agents/skills/collision-fixture/SKILL.md');
      put(generatedSkill, 'Generated skill\n');
      put(destinationSkill, 'Custom skill\n');
      const r = run('boost-sync-opencode-skills.sh');
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /unowned destination collision refuses replacement/);
      assert.equal(fs.readFileSync(generatedSkill, 'utf8'), 'Generated skill\n');
      assert.equal(fs.readFileSync(destinationSkill, 'utf8'), 'Custom skill\n');
      fs.rmSync(path.dirname(generatedSkill), { recursive: true });
      fs.rmSync(path.dirname(destinationSkill), { recursive: true });
    });
    check('api-next: external Boost skill links fail before repository writes', () => {
      const generatedSkills = path.join(phpRoot, '.agents/skills');
      const external = path.join(tmp, 'external-host-skill');
      put(path.join(external, 'SKILL.md'), 'External host content\n');

      const topLevel = path.join(generatedSkills, 'external-top-level');
      fs.symlinkSync(external, topLevel);
      let before = treeSnapshot(app);
      let r = run('boost-sync-opencode-skills.sh');
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /symlink target escapes repository root/);
      assert.equal(r.trace, '');
      assert.deepEqual(treeSnapshot(app), before);
      fs.unlinkSync(topLevel);

      const nested = path.join(generatedSkills, 'external-nested');
      put(path.join(nested, 'SKILL.md'), 'Nested fixture\n');
      fs.symlinkSync(external, path.join(nested, 'references'));
      before = treeSnapshot(app);
      r = run('boost-sync-opencode-skills.sh');
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /symlink target escapes repository root/);
      assert.equal(r.trace, '');
      assert.deepEqual(treeSnapshot(app), before);
      fs.rmSync(nested, { recursive: true });
    });
    check('api-next: external metadata link fails before reads or formatting', () => {
      const metadata = path.join(phpRoot, 'boost.json');
      const backup = metadata + '.preflight-backup';
      const external = path.join(tmp, 'external-boost.json');
      put(external, '{"skills":["must-not-be-read"]}\n');
      const hadMetadata = fs.existsSync(metadata);
      if (hadMetadata) fs.renameSync(metadata, backup);
      fs.symlinkSync(external, metadata);
      try {
        const before = treeSnapshot(app);
        const r = run('boost-sync-opencode-skills.sh');
        assert.notEqual(r.status, 0);
        assert.match(r.stderr, /symlink root or parent|symlink target escapes repository root/);
        assert.equal(r.trace, '');
        assert.deepEqual(treeSnapshot(app), before);
        assert.equal(fs.readFileSync(external, 'utf8'), '{"skills":["must-not-be-read"]}\n');
      } finally {
        fs.unlinkSync(metadata);
        if (hadMetadata) fs.renameSync(backup, metadata);
      }
    });
    check('api-next: dangling, cyclic and special Boost entries are rejected', () => {
      const generatedSkills = path.join(phpRoot, '.agents/skills');
      const invalid = path.join(generatedSkills, 'invalid-tree');
      const invokeUnchanged = (pattern) => {
        const before = treeSnapshot(app);
        const r = run('boost-sync-opencode-skills.sh');
        assert.notEqual(r.status, 0);
        assert.match(r.stderr, pattern);
        assert.equal(r.trace, '');
        assert.deepEqual(treeSnapshot(app), before);
      };

      put(path.join(invalid, 'SKILL.md'), 'Invalid fixture\n');
      fs.symlinkSync(path.join(app, 'missing-target'), path.join(invalid, 'dangling'));
      invokeUnchanged(/dangling or cyclic symlink/);
      fs.unlinkSync(path.join(invalid, 'dangling'));

      fs.symlinkSync(invalid, path.join(invalid, 'recursive'));
      invokeUnchanged(/cyclic directory symlink/);
      fs.unlinkSync(path.join(invalid, 'recursive'));

      const fifo = path.join(invalid, 'named-pipe');
      const created = spawnSync('mkfifo', [fifo], { encoding: 'utf8' });
      assert.equal(created.status, 0, created.stderr);
      invokeUnchanged(/special file is not allowed/);
      fs.rmSync(invalid, { recursive: true });
    });
    check('api-next: internal Boost links remain valid and are materialized', () => {
      const shared = path.join(phpRoot, '.ai/shared-reference');
      const generated = path.join(phpRoot, '.agents/skills/internal-link-fixture');
      const materialized = path.join(app, '.agents/skills/internal-link-fixture');
      put(path.join(shared, 'reference.md'), 'Internal reference\n');
      put(path.join(generated, 'SKILL.md'), 'Internal link fixture\n');
      fs.symlinkSync(shared, path.join(generated, 'references'));
      const r = run('boost-sync-opencode-skills.sh');
      assert.equal(r.status, 0, r.stderr);
      assert.equal(fs.lstatSync(path.join(materialized, 'references')).isSymbolicLink(), false);
      assert.equal(fs.readFileSync(path.join(materialized, 'references/reference.md'), 'utf8'), 'Internal reference\n');
    });
    check('api-next: real workflow registry parser', () => {
      fs.mkdirSync(path.join(app, 'node_modules/@playwright'), { recursive: true });
      fs.symlinkSync(path.resolve(playwright), path.join(app, 'node_modules/@playwright/test'));
      put(path.join(app, 'playwright.config.ts'), 'export default { testDir: "./e2e" };');
      const registry = path.join(app, 'tests/workflows.yml');
      const spec = path.join(app, 'e2e/account.spec.ts');
      const invoke = () => spawnSync('bun', [path.join(app, 'scripts/check-workflows.mjs')], { cwd: tmp, encoding: 'utf8' });
      assert.notEqual(invoke().status, 0);
      put(registry, 'workflows:\n  - id: login\n    tag: "@login"\n');
      const specPut = (source) => put(spec, 'import { test } from "@playwright/test";\n' + source);
      specPut('test("@login user can sign in", () => {});');
      assert.equal(invoke().status, 0);
      for (const source of [
        '// @login\ntest("unrelated", () => {});',
        'const note = "@login"; test("unrelated", () => {});',
        'test.skip("@login", () => {});',
        'test.describe.skip("@login", () => { test("child", () => {}); });',
        'test.describe("@login", () => {});',
        'test("unrelated", () => { const note = "@login"; });',
        'function neverCalled() { test("@login", () => {}); }',
      ]) {
        specPut(source);
        assert.notEqual(invoke().status, 0, source);
      }
      for (const source of [
        'test("login", { tag: "@login" }, () => {});',
        'test.describe("account", { tag: ["@login"] }, () => { test("child", () => {}); });',
        'test.describe("@login", () => { test("child", () => {}); });',
      ]) {
        specPut(source);
        const result = invoke();
        assert.equal(result.status, 0, source + '\n' + result.stderr);
      }
      specPut('test("@login-other", () => {});');
      assert.notEqual(invoke().status, 0);
      put(registry, 'workflows: []\n'); assert.notEqual(invoke().status, 0);
      put(registry, 'workflows:\n  - id: login\n    tag: "@login"\n  - id: login\n    tag: "@login"\n');
      assert.notEqual(invoke().status, 0);
    });
    check('api-next: dependency setup tags stay outside the e2e registry', () => {
      const config = path.join(app, 'playwright.config.ts');
      const spec = path.join(app, 'e2e/account.spec.ts');
      const setup = path.join(app, 'tests/auth.setup.ts');
      put(path.join(app, 'tests/workflows.yml'), 'workflows:\n  - id: login\n    tag: "@login"\n');
      put(setup, 'import { test } from "@playwright/test"; test("@login setup", () => { throw new Error("must not execute"); });');
      put(config, `export default {
        testDir: './e2e',
        projects: [
          { name: 'setup', testDir: './tests', testMatch: '**/*.setup.ts' },
          { name: 'journeys', testMatch: '**/*.spec.ts', dependencies: ['setup'] },
        ],
      };`);
      const invoke = () => spawnSync('bun', [path.join(app, 'scripts/check-workflows.mjs')], { cwd: tmp, encoding: 'utf8' });
      const specPut = (source) => put(spec, 'import { test } from "@playwright/test";\n' + source);
      specPut('test("unrelated", () => {});');
      // Prove that the real reporter includes the outside dependency despite e2e/ filtering.
      const listed = spawnSync('node', [path.join(playwright, 'cli.js'), 'test', '--list', '--reporter=json', 'e2e/'], { cwd: app, encoding: 'utf8' });
      assert.equal(listed.status, 0, listed.stderr);
      assert.match(listed.stdout, /auth\.setup\.ts/);
      let result = invoke();
      assert.notEqual(result.status, 0, 'an outside dependency tag must not satisfy an e2e journey');
      assert.match(result.stderr, /missing Playwright tag @login/);
      specPut('test.skip("@login", () => {}); test("unrelated", () => {});');
      assert.notEqual(invoke().status, 0);
      specPut('test("@login actual journey", () => {});');
      result = invoke();
      assert.equal(result.status, 0, result.stderr);
      // A sibling sharing the e2e prefix is still outside the directory.
      put(path.join(app, 'e2e-other/auth.setup.ts'), fs.readFileSync(setup, 'utf8'));
      put(config, fs.readFileSync(config, 'utf8').replace("testDir: './tests'", "testDir: './e2e-other'"));
      specPut('test("unrelated", () => {});');
      result = invoke();
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /missing Playwright tag @login/);
      // A spec symlink cannot turn an outside file into an e2e journey.
      const linked = path.join(app, 'e2e/linked.spec.ts');
      fs.symlinkSync(setup, linked);
      result = invoke();
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /missing Playwright tag @login/);
      fs.unlinkSync(linked);
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
