import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { main, parseArgs } from "../src/cli.js";

const bin = fileURLToPath(new URL("../bin/thehivecode.js", import.meta.url));
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

function run(args, cwd) {
  return spawnSync(process.execPath, [bin, ...args], { cwd, encoding: "utf8" });
}

test("parseArgs reads long options, repeats, and shorts", () => {
  const flags = parseArgs([
    "init",
    "--yes",
    "--tagline=A sign-up sheet for Saturday runs",
    "--run",
    "npm install\\nnpm test",
    "--deploy",
    "both",
    "-f",
  ]);
  assert.deepEqual(flags._, ["init"]);
  assert.equal(flags.yes, true);
  assert.equal(flags.force, true);
  assert.deepEqual(flags.run, ["npm install", "npm test"]);
  assert.deepEqual(flags.deploy, ["both"]);
});

test("--help and --version", () => {
  const help = run(["--help"]);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /thehivecode init/);
  assert.match(help.stdout, /never runs the commands/);

  const version = run(["--version"]);
  assert.equal(version.status, 0);
  assert.equal(version.stdout.trim(), pkg.version);

  const unknown = run(["dance"]);
  assert.equal(unknown.status, 1);
  assert.match(unknown.stderr, /Unknown command/);
});

test("check --json and --strict against a real file", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "hive-cli-"));
  writeFileSync(
    path.join(dir, "HIVE.md"),
    `---
tagline: A sign-up sheet for Saturday runs, with who is coming
for: A running club
---

# Saturday
`,
  );
  const checked = run(["check", "--json"], dir);
  assert.equal(checked.status, 0);
  const report = JSON.parse(checked.stdout);
  assert.equal(report.hiveReady, true);
  assert.ok(report.score < 100);

  const strict = run(["check", "--strict"], dir);
  assert.equal(strict.status, 1);
  assert.match(strict.stdout, /hive-ready: yes/);
});

test("init --yes from the executable", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "hive-bin-"));
  const result = run(["init", "--yes", "--run", "npm test"], dir);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Wrote HIVE.md/);
  const text = readFileSync(path.join(dir, "HIVE.md"), "utf8");
  assert.match(text, /npm test/);

  const check = run(["check"], dir);
  assert.equal(check.status, 0, check.stdout);
  assert.match(check.stdout, /score: 100\/100/);
});

test("main returns 1 for a missing file without throwing", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "hive-miss-"));
  let out = "";
  const code = await main(["check"], {
    cwd: dir,
    stdout: { write: (chunk) => { out += chunk; } },
    stderr: { write() {} },
    interactive: false,
  });
  assert.equal(code, 1);
  assert.match(out, /hive-ready: no/);
});
