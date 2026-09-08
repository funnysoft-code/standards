import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

// Collect the application's real Playwright declarations without launching browsers.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function fail(message) {
  throw new Error(`workflows: ${message}`);
}
try {
  const registry = Bun.YAML.parse(fs.readFileSync(path.join(root, "tests/workflows.yml"), "utf8"));
  if (!Array.isArray(registry?.workflows) || registry.workflows.length === 0)
    fail("expected a nonempty workflows array");
  const require = createRequire(path.join(root, "package.json"));
  const cli = require.resolve("@playwright/test/cli");
  // Collection executes declarations, not test bodies, global setup or browsers.
  const env = { ...process.env };
  delete env.PLAYWRIGHT_JSON_OUTPUT_NAME;
  delete env.PLAYWRIGHT_JSON_OUTPUT_FILE;
  delete env.PLAYWRIGHT_JSON_OUTPUT_DIR;
  const result = spawnSync("node", [cli, "test", "--list", "--reporter=json", "e2e/"], {
    cwd: root,
    env,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.status !== 0)
    fail("Playwright collection failed; run playwright test --list for details");
  const report = JSON.parse(result.stdout);
  if (report.errors?.length) fail("Playwright collection reported errors");
  const declared = new Set();
  function collect(suite) {
    for (const spec of suite.specs ?? []) {
      if (!spec.tests?.some((test) => test.expectedStatus !== "skipped")) continue;
      for (const tag of spec.tags ?? []) declared.add(tag.startsWith("@") ? tag : `@${tag}`);
    }
    for (const child of suite.suites ?? []) collect(child);
  }
  for (const suite of report.suites ?? []) collect(suite);
  const ids = new Set();
  const tags = new Set();
  for (const job of registry.workflows) {
    if (
      !job ||
      typeof job.id !== "string" ||
      !job.id ||
      typeof job.tag !== "string" ||
      !/^@[a-z][a-z0-9-]*$/.test(job.tag)
    )
      fail("each workflow needs an id and @tag");
    if (ids.has(job.id) || tags.has(job.tag)) fail(`duplicate workflow id or tag: ${job.id}`);
    ids.add(job.id);
    tags.add(job.tag);
    if (!declared.has(job.tag)) fail(`missing Playwright tag ${job.tag}`);
  }
  console.log(`workflows: ${ids.size} registered jobs have Playwright tags`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
