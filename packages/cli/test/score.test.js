import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { scoreFile, scoreText } from "../src/score.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

test("the repo's own HIVE.md files are hive-ready and filled in", () => {
  const files = [
    "HIVE.md",
    "templates/HIVE.md",
    "templates/examples/web-app.md",
    "templates/examples/game.md",
    "templates/examples/cli.md",
  ];
  for (const file of files) {
    const report = scoreFile(path.join(repoRoot, file));
    assert.equal(report.hiveReady, true, `${file}\n${report.errors.join("\n")}`);
    assert.equal(report.score, 100, file);
  }
});

test("a valid empty header scores 0 and stays hive-ready", () => {
  const report = scoreText("---\n---\n", "HIVE.md");
  assert.equal(report.hiveReady, true);
  assert.equal(report.score, 0);
  assert.ok(report.missing.length >= 5);
});

test("an invalid field is a fix and blocks hive-ready", () => {
  const report = scoreText("---\ntagline: tiny\nfor: Fans\n---\n\n# Name\n", "HIVE.md");
  assert.equal(report.hiveReady, false);
  assert.equal(report.fields.tagline.status, "fail");
  assert.equal(report.fields.for.status, "pass");
  assert.match(report.errors.join("\n"), /tagline is 4 characters/);
});

test("check does not run commands from the file", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "hive-check-"));
  const marker = path.join(dir, "should-not-exist");
  const hive = path.join(dir, "HIVE.md");
  writeFileSync(
    hive,
    `---
tagline: A sign-up sheet for Saturday runs, with who is coming
for: A running club and its members
problem: The club's sign-up lives in a chat thread and people miss the run
run: |
  touch ${marker}
---

# Run sheet
`,
  );
  const report = scoreFile(hive);
  assert.equal(report.hiveReady, true);
  assert.equal(readFileSync(hive, "utf8").includes("touch"), true);
  assert.throws(() => readFileSync(marker));
});
