import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const variants = ['inertia-monolith', 'api-next', 'next-only'];
const tokenPattern = /__[A-Z][A-Z0-9_]*__/g;
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (value) => JSON.stringify(value, null, 2) + '\n';
// Receipts use the formatter's compact primitive arrays, without a runtime
// dependency on JS packages. Digest canonicalization remains JSON.stringify.
function receiptJSON(value, depth = 0) {
  if (Array.isArray(value)) return `[${value.map((item) => JSON.stringify(item)).join(', ')}]`;
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  const indent = '  '.repeat(depth);
  return `{\n${Object.entries(value).map(([key, item]) => `${indent}  ${JSON.stringify(key)}: ${receiptJSON(item, depth + 1)}`).join(',\n')}\n${indent}}`;
}
const readJSON = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
function fail(message) { throw new Error(message); }
function safePath(value, allowRoot = false) {
  if (allowRoot && value === '.') return value;
  if (typeof value !== 'string' || !value || value.includes('\\') || value.includes('\0') || path.posix.isAbsolute(value) || value.split('/').some((part) => !part || part === '.' || part === '..') || /^[A-Za-z]:/.test(value)) fail(`invalid manifest path: ${value}`);
  return value;
}
function regularPath(root, relative, allowMissing = false) {
  const absolute = path.resolve(root, relative);
  // System temporary directories may have symlinked ancestors on macOS.
  // The supplied root and every path inside it must be real files/directories.
  let cursor = path.resolve(root);
  for (const part of ['', ...path.relative(cursor, absolute).split(path.sep).filter(Boolean)]) {
    cursor = path.join(cursor, part);
    if (!fs.existsSync(cursor) && !fs.lstatSync(cursor, { throwIfNoEntry: false })) {
      if (allowMissing) continue;
      fail(`missing asset: ${relative}`);
    }
    if (fs.lstatSync(cursor).isSymbolicLink()) fail(`symlink path: ${relative}`);
  }
  return absolute;
}
function identity(standards, local = false) {
  if (!standards || !/^[a-f0-9]{40}$/.test(standards.commit ?? '')) fail('immutable identity requires a full commit SHA');
  if (!/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(standards.release ?? '') && !(local && standards.release === `local-${standards.commit}`)) fail('immutable release identity requires a version tag, not a branch');
}
function layoutTokens(layout) {
  const prefix = layout.phpRoot && layout.phpRoot !== '.' ? `${layout.phpRoot}/` : '';
  return {
    __PHP_ROOT__: layout.phpRoot ?? '',
    __JS_ROOTS__: layout.jsRoots.join(','),
    __BOOST_ARTISAN__: layout.boostArtisan ?? 'not-applicable',
    __BOOST_SKILLS__: layout.boostSkills ?? 'not-applicable',
    __DESIGN_ROOT__: layout.designRoot,
    __LARAVEL_GLOBS__: ['app', 'routes', 'config', 'database', 'tests', 'Modules'].map((name) => `${prefix}${name}/**`).join(','),
  };
}
function substitute(text, tokens) {
  return text.replace(tokenPattern, (token) => Object.hasOwn(tokens, token) ? tokens[token] : token);
}
function textBytes(bytes) {
  if (bytes.includes(0)) fail('text asset contains binary bytes; declare text: false');
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}
function validateLayout(layout) {
  if (!layout || !Array.isArray(layout.jsRoots) || !layout.jsRoots.length) fail('invalid layout');
  for (const value of [layout.phpRoot, layout.boostArtisan, layout.boostSkills]) if (value !== null) safePath(value, true);
  safePath(layout.designRoot);
  for (const root of layout.jsRoots) safePath(root, true);
}
function digestOf(manifest) {
  const { assetDigest, ...content } = manifest;
  return hash(JSON.stringify(content));
}

export function createExport({ sourceRoot, target, release, commit, local = false, legacyOverrides = {} }) {
  const standards = { release, commit };
  identity(standards, local);
  const spec = readJSON(path.join(sourceRoot, 'templates/manifest.json'));
  if (spec.schemaVersion !== 1) fail('unsupported source manifest schema');
  if (fs.existsSync(target)) fail('export target must not exist');
  regularPath(target, '.', true);
  const output = [];
  const manifest = { schemaVersion: 1, standards, local, variants: {} };
  for (const variant of variants) {
    const selected = spec.variants?.[variant];
    if (!selected || !Array.isArray(selected.assetSets)) fail(`missing variant: ${variant}`);
    if (selected.transforms?.length) fail(`unknown transform: ${selected.transforms[0]}`);
    if (local && variant === 'inertia-monolith') {
      if (legacyOverrides.designRoot) selected.layout.designRoot = legacyOverrides.designRoot;
      if (legacyOverrides.boostArtisan) selected.layout.boostArtisan = legacyOverrides.boostArtisan;
    }
    validateLayout(selected.layout);
    const assets = [];
    const seen = new Set();
    for (const set of selected.assetSets) {
      if (!Array.isArray(spec.assetSets[set])) fail(`missing asset set: ${set}`);
      for (const entry of spec.assetSets[set]) {
        safePath(entry.source);
        if (typeof entry.text !== 'boolean') fail('asset requires explicit text policy');
        for (const excluded of entry.exclude ?? []) safePath(excluded);
        const destination = substitute(entry.destination, layoutTokens(selected.layout)).replace(/^\.\//, '');
        safePath(destination, true);
        function collect(relative = '') {
          if ((entry.exclude ?? []).some((item) => relative === item || relative.startsWith(`${item}/`))) return;
          const source = regularPath(sourceRoot, path.posix.join(entry.source, relative));
          const stat = fs.statSync(source);
          if (stat.isDirectory()) {
            for (const name of fs.readdirSync(source).sort()) collect(path.posix.join(relative, name));
            return;
          }
          if (!stat.isFile()) fail(`non-file asset: ${source}`);
          const assetPath = safePath(path.posix.join(destination, relative));
          if (seen.has(assetPath)) fail(`duplicate asset path: ${assetPath}`);
          seen.add(assetPath);
          let bytes = fs.readFileSync(source);
          if (entry.text) {
            let text = textBytes(bytes);
            const tokens = layoutTokens(selected.layout);
            if (local && variant === 'inertia-monolith' && legacyOverrides.laravelGlobs) tokens.__LARAVEL_GLOBS__ = legacyOverrides.laravelGlobs;
            text = substitute(text, tokens);
            const unresolved = text.match(tokenPattern) ?? [];
            if (unresolved.some((token) => !['__TEAM__', '__TEAM_SLUG__', '__PRODUCT_BLURB__'].includes(token))) fail(`unresolved token in ${assetPath}`);
            bytes = Buffer.from(text);
          }
          const exported = `variants/${variant}/files/${assetPath}`;
          assets.push({ path: assetPath, source: exported, sha256: hash(bytes), mode: stat.mode & 0o111 ? 0o755 : 0o644, text: entry.text });
          output.push({ source: exported, bytes });
        }
        collect();
      }
    }
    // Generate native adapters before hashing the export. Their bytes are part
    // of the same immutable contract, not an unverified post-stamp side effect.
    const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'standards-providers-'));
    try {
      for (const asset of assets) {
        const item = output.find((candidate) => candidate.source === asset.source);
        const dest = path.join(staging, asset.path);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, item.bytes, { mode: asset.mode });
      }
      execFileSync(process.execPath, [path.join(staging, 'scripts/provider-sync.mjs'), '--root', staging], { stdio: 'pipe' });
      function collectAdapters(directory = '') {
        for (const entry of fs.readdirSync(path.join(staging, directory), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
          const relative = path.posix.join(directory, entry.name);
          if (entry.isDirectory()) { collectAdapters(relative); continue; }
          if (seen.has(relative)) continue;
          const bytes = fs.readFileSync(path.join(staging, relative));
          const exported = `variants/${variant}/files/${relative}`;
          const mode = fs.statSync(path.join(staging, relative)).mode & 0o111 ? 0o755 : 0o644;
          assets.push({ path: relative, source: exported, sha256: hash(bytes), mode, text: !bytes.includes(0) });
          output.push({ source: exported, bytes });
        }
      }
      collectAdapters();
    } finally {
      fs.rmSync(staging, { recursive: true, force: true });
    }
    assets.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
    manifest.variants[variant] = { layout: selected.layout, assetSets: selected.assetSets, assets };
  }
  const runtime = fs.readFileSync(fileURLToPath(import.meta.url));
  manifest.runtime = { source: 'apply.mjs', sha256: hash(runtime) };
  manifest.assetDigest = digestOf(manifest);
  for (const item of [...output, { source: 'apply.mjs', bytes: runtime }, { source: 'manifest.json', bytes: Buffer.from(json(manifest)) }]) {
    const dest = path.join(target, item.source);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, item.bytes);
  }
  return manifest;
}

export function verifyExport(exportRoot, expectedDigest, { allowLocal = false } = {}) {
  if (expectedDigest !== undefined && !/^[a-f0-9]{64}$/.test(expectedDigest)) fail('invalid expected digest');
  const manifest = readJSON(regularPath(exportRoot, 'manifest.json'));
  if (manifest.schemaVersion !== 1) fail('unsupported export manifest schema');
  if (manifest.local && !allowLocal) fail('local identity is not a release export');
  identity(manifest.standards, allowLocal && manifest.local);
  for (const variant of variants) {
    const selected = manifest.variants?.[variant];
    if (!selected || !Array.isArray(selected.assets) || !selected.assets.length) fail(`missing variant assets: ${variant}`);
    validateLayout(selected.layout);
    const seen = new Set();
    for (const asset of selected.assets) {
      safePath(asset.path); safePath(asset.source);
      if (!asset.source.startsWith(`variants/${variant}/files/`)) fail('invalid asset source path');
      if (['STANDARDS_VERSION', 'STANDARDS_MANIFEST.json'].includes(asset.path)) fail('reserved asset path');
      if (seen.has(asset.path)) fail('duplicate asset path');
      seen.add(asset.path);
      if (![0o644, 0o755].includes(asset.mode) || typeof asset.text !== 'boolean') fail('invalid asset mode or text policy');
      if (hash(fs.readFileSync(regularPath(exportRoot, asset.source))) !== asset.sha256) fail(`asset digest mismatch: ${asset.path}`);
    }
  }
  safePath(manifest.runtime?.source);
  if (hash(fs.readFileSync(regularPath(exportRoot, manifest.runtime.source))) !== manifest.runtime.sha256) fail('runtime digest mismatch');
  if (digestOf(manifest) !== manifest.assetDigest || (expectedDigest && expectedDigest !== manifest.assetDigest)) fail('export digest mismatch');
  return manifest;
}

export function applyExport({ exportRoot, target, variant, team, teamSlug, productBlurb, expectedDigest, allowLocal = false }) {
  if (!variants.includes(variant)) fail(`unknown variant: ${variant}`);
  if (![target, team, teamSlug, productBlurb].every((value) => typeof value === 'string' && value.length)) fail('target, team, team-slug and product-blurb are required');
  const manifest = verifyExport(exportRoot, expectedDigest, { allowLocal });
  if (!manifest.local && expectedDigest === undefined) fail('expected digest is required for nonlocal export application');
  const selected = manifest.variants[variant];
  const tokens = { __TEAM__: team, __TEAM_SLUG__: teamSlug, __PRODUCT_BLURB__: productBlurb };
  const writes = selected.assets.map((asset) => {
    let bytes = fs.readFileSync(path.join(exportRoot, asset.source));
    if (asset.text) {
      const text = substitute(textBytes(bytes), tokens);
      if (text.match(tokenPattern)) fail(`unresolved token in ${asset.path}`);
      if (asset.path.endsWith('.json')) JSON.parse(text);
      bytes = Buffer.from(text);
    }
    return { path: asset.path, mode: asset.mode, bytes };
  });
  // A product brief is authored, while the small instruction bridge is managed.
  const entry = writes.find((item) => item.path === 'AGENTS.md');
  if (entry && fs.existsSync(regularPath(target, 'AGENTS.md', true))) {
    let existing = fs.readFileSync(path.join(target, 'AGENTS.md'), 'utf8')
      .replaceAll('.opencode/rules', '.agents/rules').replaceAll('.opencode/skills', '.agents/skills');
    const pattern = /<!-- funnysoft-provider-sync:start -->[\s\S]*?<!-- funnysoft-provider-sync:end -->/;
    const block = entry.bytes.toString().match(pattern)?.[0];
    if (!block) fail('missing canonical instruction bridge');
    const starts = existing.split('<!-- funnysoft-provider-sync:start -->').length - 1;
    const ends = existing.split('<!-- funnysoft-provider-sync:end -->').length - 1;
    const markers = existing.split('<!-- funnysoft-provider-sync:').length - 1;
    if (markers && (starts !== 1 || ends !== 1 || markers !== 2 || !pattern.test(existing))) fail('malformed provider-sync markers in AGENTS.md');
    existing = pattern.test(existing) ? existing.replace(pattern, () => block) : `${existing.trimEnd()}\n\n${block}\n`;
    entry.bytes = Buffer.from(existing);
  }
  // Team substitution changes native skill bytes. Bind the adapter receipt to
  // those final bytes, retaining the immutable export digest in its own receipt.
  const providerReceipt = writes.find((item) => item.path === '.agents/provider-sync.json');
  const generatedProviderPaths = new Set();
  if (providerReceipt) {
    const receipt = JSON.parse(providerReceipt.bytes);
    for (const name of Object.keys(receipt.generated)) {
      generatedProviderPaths.add(name);
      const item = writes.find((candidate) => candidate.path === name);
      if (!item) fail(`missing generated provider asset: ${name}`);
      receipt.generated[name] = hash(item.bytes);
    }
    providerReceipt.bytes = Buffer.from(receiptJSON(receipt) + '\n');
  }
  writes.push({ path: 'STANDARDS_VERSION', bytes: Buffer.from(manifest.standards.release + '\n'), mode: 0o644 });
  writes.push({ path: 'STANDARDS_MANIFEST.json', bytes: Buffer.from(receiptJSON({ schemaVersion: 1, standards: manifest.standards, assetDigest: manifest.assetDigest, variant, layout: selected.layout, local: manifest.local }) + '\n'), mode: 0o644 });
  for (const item of writes) {
    const dest = regularPath(target, item.path, true);
    if (fs.existsSync(dest) && !fs.statSync(dest).isFile()) fail(`target is not a file: ${item.path}`);
    if (fs.existsSync(dest)) fs.readFileSync(dest);
    let parent = path.dirname(dest);
    while (!fs.existsSync(parent)) parent = path.dirname(parent);
    if (!fs.statSync(parent).isDirectory()) fail(`target parent is not a directory: ${item.path}`);
  }
  // Native provider files can contain product-specific settings that cannot be
  // reconstructed from an export. Refuse a non-identical replacement rather
  // than guessing at a merge or discarding provider-sync preservation state.
  const protectedProviderPaths = new Set([
    '.agents/provider-sync.json',
    '.mcp.json',
    'opencode.json',
    '.cursor/mcp.json',
    '.grok/config.toml',
    '.codex/config.toml',
    ...generatedProviderPaths,
  ]);
  protectedProviderPaths.delete('AGENTS.md');
  for (const item of writes) {
    if (!protectedProviderPaths.has(item.path) && !/(^|\/)CLAUDE\.md$/.test(item.path)) continue;
    const dest = path.join(target, item.path);
    if (fs.existsSync(dest) && !fs.readFileSync(dest).equals(item.bytes)) {
      fail(`provider reconciliation required before export apply: ${item.path}`);
    }
  }
  for (const item of writes) {
    const dest = path.join(target, item.path);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, item.bytes);
    fs.chmodSync(dest, item.mode);
  }
  return manifest;
}

function main() {
  const [command, ...args] = process.argv.slice(2);
  const options = {};
  const allowed = ['target', 'variant', 'release', 'commit', 'team', 'team-slug', 'product-blurb', 'from-export', 'expected-digest', 'boost-artisan', 'design-root', 'laravel-globs'];
  while (args.length) {
    const key = args.shift();
    if (!key.startsWith('--') || !allowed.includes(key.slice(2)) || !args.length || args[0].startsWith('--') || Object.hasOwn(options, key.slice(2))) fail(`unknown, duplicate or missing option: ${key}`);
    options[key.slice(2)] = args.shift();
  }
  if (!options.target) fail('--target is required');
  const commandOptions = command === 'export' ? ['target', 'release', 'commit'] : allowed;
  for (const key of Object.keys(options)) if (!commandOptions.includes(key)) fail(`unsupported export option: --${key}`);
  const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  if (command === 'export') {
    createExport({ sourceRoot, target: options.target, release: options.release, commit: options.commit });
    return;
  }
  if (!['stamp', 'apply'].includes(command)) fail('usage: export|stamp|apply with --target');
  const variant = options.variant ?? 'inertia-monolith';
  if (!variants.includes(variant)) fail(`unknown variant: ${variant}`);
  let exportRoot = options['from-export'];
  let temporary;
  let local = false;
  let expectedDigest = options['expected-digest'];
  try {
    if (!exportRoot) {
      if (command === 'apply') fail('--from-export is required');
      let release = options.release, commit = options.commit;
      if (!options.variant && !release && !commit) {
        commit = execFileSync('git', ['-C', sourceRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
        release = `local-${commit}`;
        local = true;
      }
      identity({ release, commit }, local);
      if (!local && ['boost-artisan', 'design-root', 'laravel-globs'].some((key) => options[key])) fail('layout overrides are only supported by legacy local stamping');
      temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'standards-export-'));
      exportRoot = path.join(temporary, 'bundle');
      const created = createExport({ sourceRoot, target: exportRoot, release, commit, local, legacyOverrides: { boostArtisan: options['boost-artisan'], designRoot: options['design-root'], laravelGlobs: options['laravel-globs'] } });
      expectedDigest = created.assetDigest;
    } else if (options.release || options.commit) fail('identity comes from --from-export');
    if (options['from-export'] && ['boost-artisan', 'design-root', 'laravel-globs'].some((key) => options[key])) fail('export layout cannot be overridden');
    applyExport({ exportRoot, target: options.target, variant, team: options.team, teamSlug: options['team-slug'], productBlurb: options['product-blurb'], expectedDigest, allowLocal: local });
    console.log(`stamped ${variant} -> ${options.target}`);
  } finally {
    if (temporary) fs.rmSync(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && fs.existsSync(process.argv[1]) && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(`standards: ${error.message}`); process.exitCode = 1; }
}
