import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { syncProviders } from '../scripts/provider-sync.mjs';

const script = fileURLToPath(new URL('../scripts/provider-sync.mjs', import.meta.url));
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'provider-sync-'));
const put = (root, name, content) => {
  fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
  fs.writeFileSync(path.join(root, name), content);
};
const read = (root, name) => fs.readFileSync(path.join(root, name), 'utf8');
const run = (root, ...flags) => spawnSync(process.execPath, [script, '--root', root, ...flags], { encoding: 'utf8' });
function snapshot(root) {
  return fs.readdirSync(root, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((entry) => {
    const file = path.join(root, entry.name);
    return entry.isDirectory() ? snapshot(file).map(([name, bytes]) => [`${entry.name}/${name}`, bytes]) : [[entry.name, fs.lstatSync(file).isSymbolicLink() ? fs.readlinkSync(file) : fs.readFileSync(file, 'base64')]];
  });
}
try {
  const app = path.join(temporary, 'app');
  put(app, 'AGENTS.md', '# Product\n\nBefore work, read `.opencode/rules/*.md`.\n');
  put(app, 'services/api/AGENTS.md', '# API\nKeep API scope.\n');
  put(app, '.opencode/rules/product.md', '# Product policy\n');
  put(app, '.opencode/skills/example/SKILL.md', '---\nname: example\ndescription: Test skill\n---\n\nRead references/details.md.\n');
  put(app, '.opencode/skills/example/references/details.md', '# Details\n');
  put(app, '.opencode/skills/example/run.sh', '#!/bin/sh\nexit 0\n');
  fs.chmodSync(path.join(app, '.opencode/skills/example/run.sh'), 0o755);
  put(app, '.opencode/agent/adversary.md', '---\ndescription: Review changes\nmode: subagent\n---\n\nReview actual files.\n');
  put(app, 'opencode.json', JSON.stringify({ instructions: ['.opencode/rules/*.md', 'product-policy.md'], mcp: { servers: { boost: { type: 'local', command: ['php', 'services/api/artisan', 'boost:mcp'] }, mobbin: { type: 'remote', url: 'https://api.mobbin.com/mcp' } } } }));
  put(app, '.codex/config.toml', '# Local project preference\n[features]\nexample = true\n');
  put(app, '.cursor/mcp.json', JSON.stringify({ mcpServers: { 'product-tool': { command: 'product-tool' } } }));
  put(app, 'scripts/product.sh', '# Keep product script\n');
  put(app, 'STANDARDS_MANIFEST.json', '{"existing":"receipt"}\n');
  const before = snapshot(app);
  assert.equal(run(app, '--check').status, 1);
  assert.deepEqual(snapshot(app), before, '--check cannot write');
  let result = run(app);
  assert.equal(result.status, 0, result.stderr);
  assert.match(read(app, 'AGENTS.md'), /^# Product/);
  assert.doesNotMatch(read(app, 'AGENTS.md'), /\.opencode\/rules/);
  assert.match(read(app, 'AGENTS.md'), /\.agents\/rules/);
  assert.match(read(app, 'CLAUDE.md'), /@AGENTS.md/);
  assert.match(read(app, 'services/api/CLAUDE.md'), /@AGENTS.md/);
  assert.equal(read(app, 'services/api/AGENTS.md'), '# API\nKeep API scope.\n');
  assert.equal(read(app, '.agents/rules/product.md'), '# Product policy\n');
  assert.ok(!fs.existsSync(path.join(app, '.opencode/rules/product.md')));
  assert.ok(!fs.existsSync(path.join(app, '.opencode/skills/example/SKILL.md')));
  for (const directory of ['.claude/skills', '.grok/skills']) {
    assert.equal(read(app, `${directory}/example/references/details.md`), '# Details\n');
    assert.ok(!fs.lstatSync(path.join(app, `${directory}/example/SKILL.md`)).isSymbolicLink());
    assert.equal(fs.statSync(path.join(app, `${directory}/example/run.sh`)).mode & 0o777, 0o755);
  }
  const opencode = JSON.parse(read(app, 'opencode.json'));
  assert.deepEqual(opencode.mcp.boost.command, ['php', 'services/api/artisan', 'boost:mcp']);
  assert.ok(!opencode.mcp.servers);
  assert.ok(opencode.instructions.includes('product-policy.md'));
  assert.match(read(app, '.codex/config.toml'), /\[mcp_servers\."boost"\]/);
  assert.match(read(app, '.codex/config.toml'), /example = true/);
  assert.match(read(app, '.grok/config.toml'), /\[mcp_servers\."mobbin"\]/);
  assert.ok(JSON.parse(read(app, '.cursor/mcp.json')).mcpServers['product-tool']);
  assert.deepEqual(JSON.parse(read(app, '.mcp.json')).mcpServers.boost.args, ['services/api/artisan', 'boost:mcp']);
  assert.match(read(app, '.claude/agents/adversary.md'), /\.agents\/reviewers\/adversary.md/);
  assert.match(read(app, '.codex/agents/adversary.toml'), /developer_instructions/);
  assert.equal(read(app, 'STANDARDS_MANIFEST.json'), '{"existing":"receipt"}\n');
  assert.equal(read(app, 'scripts/product.sh'), '# Keep product script\n');
  const once = snapshot(app);
  assert.equal(run(app, '--check').status, 0);
  assert.equal(run(app).status, 0);
  assert.deepEqual(snapshot(app), once, 'second sync is a fixed point');
  put(app, '.agents/skills/example/references/details.md', '# Updated canonical details\n');
  assert.equal(run(app, '--check').status, 1);
  assert.equal(run(app).status, 0);
  assert.equal(read(app, '.grok/skills/example/references/details.md'), '# Updated canonical details\n');
  const mcp = JSON.parse(read(app, '.agents/mcp.json'));
  mcp.servers.mobbin.enabled = false;
  delete mcp.servers.boost;
  put(app, '.agents/mcp.json', JSON.stringify(mcp));
  assert.equal(run(app).status, 0);
  assert.equal(JSON.parse(read(app, 'opencode.json')).mcp.mobbin.enabled, false);
  assert.ok(!JSON.parse(read(app, 'opencode.json')).mcp.boost);
  assert.ok(!JSON.parse(read(app, '.mcp.json')).mcpServers.mobbin);
  assert.doesNotMatch(read(app, '.codex/config.toml'), /\[mcp_servers/);
  fs.unlinkSync(path.join(app, '.agents/skills/example/references/details.md'));
  assert.equal(run(app, '--check').status, 1);
  assert.equal(run(app).status, 0);
  assert.ok(!fs.existsSync(path.join(app, '.claude/skills/example/references/details.md')));
  assert.equal(run(app, '--check').status, 0);
  const receiptBeforeRemoval = read(app, '.agents/provider-sync.json');
  fs.unlinkSync(path.join(app, '.agents/skills/example/run.sh'));
  const unlink = fs.unlinkSync;
  try {
    fs.unlinkSync = (file) => {
      if (String(file).endsWith('.grok/skills/example/run.sh')) throw new Error('injected unlink failure');
      return unlink(file);
    };
    assert.throws(() => syncProviders({ root: app }), /injected unlink failure/);
  } finally {
    fs.unlinkSync = unlink;
  }
  assert.equal(read(app, '.agents/provider-sync.json'), receiptBeforeRemoval);
  assert.equal(run(app, '--check').status, 1, 'failed removal must remain visible as drift');
  assert.equal(run(app).status, 0);
  assert.ok(!fs.existsSync(path.join(app, '.grok/skills/example/run.sh')));
  assert.equal(run(app, '--check').status, 0);
  put(app, '.claude/skills/example/SKILL.md', '# Hand edit\n');
  const edited = snapshot(app);
  result = run(app);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /edited generated file/);
  assert.deepEqual(snapshot(app), edited, 'conflicts fail before writes');

  const collision = path.join(temporary, 'collision');
  put(collision, '.agents/rules/product.md', 'canonical');
  put(collision, '.opencode/rules/product.md', 'legacy');
  const collisionBefore = snapshot(collision);
  assert.match(run(collision).stderr, /conflicting canonical/);
  assert.deepEqual(snapshot(collision), collisionBefore);
  const tomlCases = [
    '[mcp_servers.tool]\ncommand = "custom"\n',
    '["mcp_servers"."tool"]\ncommand = "custom"\n',
    'mcp_servers.tool.command = "custom"\n',
  ];
  for (const [index, content] of tomlCases.entries()) {
    const toml = path.join(temporary, `toml-${index}`);
    put(toml, '.agents/mcp.json', '{"servers":{"tool":{"command":["tool"]}}}');
    put(toml, '.codex/config.toml', content);
    const tomlBefore = snapshot(toml);
    assert.match(run(toml).stderr, /unmanaged MCP table conflict/, content);
    assert.deepEqual(snapshot(toml), tomlBefore, content);
  }
  const reserved = path.join(temporary, 'reserved-mcp-name');
  put(reserved, '.agents/mcp.json', '{"servers":{"__proto__":{"command":["tool"]}}}');
  const reservedBefore = snapshot(reserved);
  assert.match(run(reserved).stderr, /invalid MCP server name/);
  assert.deepEqual(snapshot(reserved), reservedBefore);
  const legacyReserved = path.join(temporary, 'legacy-reserved-mcp-name');
  put(legacyReserved, 'opencode.json', '{"mcp":{"servers":{"__proto__":{"type":"local","command":["tool"]}}}}');
  const legacyReservedBefore = snapshot(legacyReserved);
  assert.match(run(legacyReserved).stderr, /invalid MCP server name/);
  assert.deepEqual(snapshot(legacyReserved), legacyReservedBefore);

  const jsonCollisions = [
    ['opencode.json', { mcp: { tool: { type: 'local', command: ['replacement'] } } }],
    ['.cursor/mcp.json', { mcpServers: { tool: { command: 'replacement', args: [] } } }],
    ['.mcp.json', { mcpServers: { tool: { command: 'replacement', args: [] } } }],
  ];
  for (const [destination, config] of jsonCollisions) {
    const root = path.join(temporary, `json-collision-${destination.replaceAll('/', '-')}`);
    put(root, '.agents/mcp.json', JSON.stringify({ servers: { tool: { command: ['canonical', '--serve'] } } }));
    put(root, destination, JSON.stringify(config));
    const beforeConflict = snapshot(root);
    result = run(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, new RegExp(`managed MCP entry conflict.*${destination.replaceAll('.', '\\.')}`));
    assert.deepEqual(snapshot(root), beforeConflict, `${destination} conflict must fail before writes`);
  }

  const override = path.join(temporary, 'json-auth-override');
  put(override, '.agents/mcp.json', JSON.stringify({ servers: { private: { url: 'https://example.test/mcp' } } }));
  assert.equal(run(override).status, 0);
  const overrideConfig = JSON.parse(read(override, '.cursor/mcp.json'));
  overrideConfig.mcpServers.private.headers = { Authorization: 'fixture-secret' };
  put(override, '.cursor/mcp.json', JSON.stringify(overrideConfig));
  const overrideBefore = snapshot(override);
  result = run(override);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /managed MCP entry conflict/);
  assert.doesNotMatch(result.stderr, /fixture-secret/);
  assert.deepEqual(snapshot(override), overrideBefore, 'same-name auth override must not be discarded');
  assert.doesNotMatch(read(override, '.agents/provider-sync.json'), /fixture-secret/);

  const managed = path.join(temporary, 'managed-json');
  put(managed, '.agents/mcp.json', JSON.stringify({ servers: { tool: { command: ['canonical', '--old'] } } }));
  put(managed, '.cursor/mcp.json', JSON.stringify({ mcpServers: { private: { url: 'https://private.example.test/mcp', headers: { Authorization: 'unrelated-fixture-secret' } } } }));
  assert.equal(run(managed).status, 0);
  let receiptText = read(managed, '.agents/provider-sync.json');
  let receipt = JSON.parse(receiptText);
  assert.deepEqual(Object.keys(receipt.mcpEntries).sort(), ['.cursor/mcp.json', '.mcp.json', 'opencode.json']);
  for (const entries of Object.values(receipt.mcpEntries))
    for (const checksum of Object.values(entries)) assert.match(checksum, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(receiptText, /canonical|--old|command|args|unrelated-fixture-secret/);
  assert.equal(JSON.parse(read(managed, '.cursor/mcp.json')).mcpServers.private.headers.Authorization, 'unrelated-fixture-secret');
  put(managed, '.agents/mcp.json', JSON.stringify({ servers: { tool: { command: ['canonical', '--new'] } } }));
  assert.equal(run(managed).status, 0, 'unchanged generated entries permit canonical updates');
  assert.deepEqual(JSON.parse(read(managed, 'opencode.json')).mcp.tool.command, ['canonical', '--new']);
  assert.deepEqual(JSON.parse(read(managed, '.cursor/mcp.json')).mcpServers.tool.args, ['--new']);
  assert.deepEqual(JSON.parse(read(managed, '.mcp.json')).mcpServers.tool.args, ['--new']);
  put(managed, '.agents/mcp.json', JSON.stringify({ servers: {} }));
  assert.equal(run(managed).status, 0, 'unchanged generated entries permit stale removal');
  assert.ok(!JSON.parse(read(managed, 'opencode.json')).mcp.tool);
  assert.ok(!JSON.parse(read(managed, '.cursor/mcp.json')).mcpServers.tool);
  assert.ok(!JSON.parse(read(managed, '.mcp.json')).mcpServers.tool);
  assert.equal(run(managed, '--check').status, 0);

  const repurposed = path.join(temporary, 'stale-repurposed');
  put(repurposed, '.agents/mcp.json', JSON.stringify({ servers: { tool: { command: ['canonical'] } } }));
  assert.equal(run(repurposed).status, 0);
  put(repurposed, '.agents/mcp.json', JSON.stringify({ servers: {} }));
  const repurposedConfig = JSON.parse(read(repurposed, '.mcp.json'));
  repurposedConfig.mcpServers.tool = { command: 'user-replacement', args: [] };
  put(repurposed, '.mcp.json', JSON.stringify(repurposedConfig));
  const repurposedBefore = snapshot(repurposed);
  result = run(repurposed);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /managed MCP entry conflict.*\.mcp\.json/);
  assert.deepEqual(snapshot(repurposed), repurposedBefore, 'repurposed stale key must block every write');

  const legacyReceipt = path.join(temporary, 'legacy-receipt');
  put(legacyReceipt, '.agents/mcp.json', JSON.stringify({ servers: { tool: { command: ['canonical', '--serve'] } } }));
  put(legacyReceipt, 'opencode.json', JSON.stringify({ mcp: { tool: { type: 'local', command: ['canonical', '--serve'] } } }));
  put(legacyReceipt, '.cursor/mcp.json', JSON.stringify({ mcpServers: { tool: { command: 'canonical', args: ['--serve'] } } }));
  put(legacyReceipt, '.mcp.json', JSON.stringify({ mcpServers: { tool: { command: 'canonical', args: ['--serve'] } } }));
  put(legacyReceipt, '.agents/provider-sync.json', JSON.stringify({ schemaVersion: 1, generated: {}, servers: ['tool'], preservedClaude: [] }));
  assert.equal(run(legacyReceipt).status, 0, 'legacy receipts bootstrap only exact canonical entries');
  receipt = JSON.parse(read(legacyReceipt, '.agents/provider-sync.json'));
  assert.match(receipt.mcpEntries['opencode.json'].tool, /^[a-f0-9]{64}$/);
  assert.equal(run(legacyReceipt, '--check').status, 0);

  const legacyStale = path.join(temporary, 'legacy-stale');
  put(legacyStale, '.agents/mcp.json', JSON.stringify({ servers: {} }));
  put(legacyStale, '.mcp.json', JSON.stringify({ mcpServers: { tool: { command: 'user-replacement' } } }));
  put(legacyStale, '.agents/provider-sync.json', JSON.stringify({ schemaVersion: 1, generated: {}, servers: ['tool'], preservedClaude: [] }));
  const legacyStaleBefore = snapshot(legacyStale);
  assert.match(run(legacyStale).stderr, /managed MCP entry conflict.*\.mcp\.json/);
  assert.deepEqual(snapshot(legacyStale), legacyStaleBefore, 'legacy receipt cannot prove a stale entry is managed');

  const version = path.join(temporary, 'v2');
  put(version, 'opencode.json', '{"permissions":{}}');
  assert.match(run(version).stderr, /V2-only field/);
  const ignoredClaude = path.join(temporary, 'ignored-claude');
  put(ignoredClaude, 'AGENTS.md', '# Product\n');
  put(ignoredClaude, 'apps/web/AGENTS.md', '# Next runtime prompt\n');
  put(ignoredClaude, 'apps/web/.gitignore', 'CLAUDE.md\n');
  assert.equal(spawnSync('git', ['init', '-q'], { cwd: ignoredClaude, encoding: 'utf8' }).status, 0);
  put(
    ignoredClaude,
    '.agents/provider-sync.json',
    JSON.stringify(
      {
        schemaVersion: 1,
        generated: { 'apps/web/CLAUDE.md': '0'.repeat(64) },
        servers: [],
        mcpEntries: {},
        preservedClaude: [],
      },
      null,
      2,
    ) + '\n',
  );
  result = run(ignoredClaude);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(
    !fs.existsSync(path.join(ignoredClaude, 'apps/web/CLAUDE.md')),
    'gitignored nested CLAUDE.md must not be generated',
  );
  receipt = JSON.parse(read(ignoredClaude, '.agents/provider-sync.json'));
  assert.ok(!receipt.generated['apps/web/CLAUDE.md'], 'receipt must not claim a gitignored nested CLAUDE.md');
  assert.ok(receipt.generated['CLAUDE.md']);
  assert.equal(run(ignoredClaude, '--check').status, 0, 'clean checkout without gitignored CLAUDE.md must not report drift');

  const claude = path.join(temporary, 'claude');
  put(claude, 'AGENTS.md', '# Boost guidelines\n');
  put(claude, 'CLAUDE.md', '# Boost guidelines\n');
  put(claude, 'docs/BigQuery/AGENTS.md', '# Query policy\n');
  put(claude, 'docs/BigQuery/CLAUDE.md', '# Application runtime prompt\n');
  assert.equal(run(claude, '--preserve-claude', 'docs/BigQuery/CLAUDE.md').status, 0);
  assert.match(read(claude, 'CLAUDE.md'), /@AGENTS.md/);
  assert.equal(read(claude, 'docs/BigQuery/CLAUDE.md'), '# Application runtime prompt\n');
  assert.equal(run(claude, '--check').status, 0);
  assert.equal(run(claude).status, 0);
  assert.equal(read(claude, 'docs/BigQuery/CLAUDE.md'), '# Application runtime prompt\n');
  const secret = path.join(temporary, 'secret');
  put(secret, 'opencode.json', JSON.stringify({ mcp: { private: { type: 'remote', url: 'https://example.test/mcp', headers: { Authorization: 'fixture-only' } } } }));
  const secretBefore = snapshot(secret);
  result = run(secret);
  assert.notEqual(result.status, 0);
  assert.doesNotMatch(result.stderr, /fixture-only/);
  assert.deepEqual(snapshot(secret), secretBefore);
  const link = path.join(temporary, 'linked');
  put(link, 'AGENTS.md', '# Product\n');
  fs.symlinkSync(app, path.join(link, '.agents'));
  assert.match(run(link).stderr, /symlink/);
  console.log('provider sync: migration, scoped bridges, native files, MCP, preservation, drift and idempotence passed');
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
