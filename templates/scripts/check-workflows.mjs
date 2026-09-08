import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Bun's YAML parser keeps the registry gate independent of product packages.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function fail(message) { throw new Error(`workflows: ${message}`); }
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? files(file) : /\.(spec|test)\.[cm]?[jt]sx?$/.test(entry.name) ? [file] : [];
  });
}
try {
  const registry = Bun.YAML.parse(fs.readFileSync(path.join(root, 'tests/workflows.yml'), 'utf8'));
  if (!Array.isArray(registry?.workflows) || registry.workflows.length === 0) fail('expected a nonempty workflows array');
  const specs = files(path.join(root, 'e2e')).map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  const ids = new Set();
  const tags = new Set();
  for (const job of registry.workflows) {
    if (!job || typeof job.id !== 'string' || !job.id || typeof job.tag !== 'string' || !/^@[a-z][a-z0-9-]*$/.test(job.tag)) fail('each workflow needs an id and @tag');
    if (ids.has(job.id) || tags.has(job.tag)) fail(`duplicate workflow id or tag: ${job.id}`);
    ids.add(job.id); tags.add(job.tag);
    // Match a full tag token, including Playwright's tag option and title tags.
    if (!new RegExp(`${job.tag}(?![a-zA-Z0-9_-])`).test(specs)) fail(`missing Playwright tag ${job.tag}`);
  }
  console.log(`workflows: ${ids.size} registered jobs have Playwright tags`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
