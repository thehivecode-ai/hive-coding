import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { projectDefaults, renderHive, runInit, yamlScalar } from "../src/init.js";
import { scoreText } from "../src/score.js";

function capture() {
  let out = "";
  let err = "";
  return {
    stdout: { write: (chunk) => { out += chunk; } },
    stderr: { write: (chunk) => { err += chunk; } },
    read: () => ({ out, err }),
  };
}

test("defaults from package.json are hive-ready", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "hive-init-"));
  writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({
      name: "@acme/saturday-run",
      description: "A sign-up sheet for the club's Saturday run",
      scripts: { dev: "vite" },
    }),
  );
  writeFileSync(path.join(dir, "vercel.json"), "{}\n");
  const defaults = projectDefaults(dir);
  assert.equal(defaults.title, "Saturday run");
  assert.equal(defaults.tagline, "A sign-up sheet for the club's Saturday run");
  assert.match(defaults.run, /npm install/);
  assert.match(defaults.run, /npm run dev/);
  assert.deepEqual(defaults.deploy, ["vercel"]);
  const report = scoreText(renderHive(defaults));
  assert.equal(report.hiveReady, true, report.errors.join("\n"));
  assert.equal(report.score, 100);
});

test("init --yes writes, refuses to clobber, and --force replaces", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "hive-yes-"));
  const io = capture();
  assert.equal(await runInit({ cwd: dir, flags: { yes: true }, ...io, interactive: false }), 0);
  const first = readFileSync(path.join(dir, "HIVE.md"), "utf8");
  assert.match(first, /^---\n/);
  assert.match(first, /^# /m);

  const again = capture();
  assert.equal(await runInit({ cwd: dir, flags: { yes: true }, ...again, interactive: false }), 1);
  assert.match(again.read().err, /already exists/);
  assert.equal(readFileSync(path.join(dir, "HIVE.md"), "utf8"), first);

  const forced = capture();
  assert.equal(
    await runInit({ cwd: dir, flags: { yes: true, force: true, tagline: "Hours: a weekly file for one shop counter" }, ...forced, interactive: false }),
    0,
  );
  const second = readFileSync(path.join(dir, "HIVE.md"), "utf8");
  assert.match(second, /tagline: "Hours: a weekly file for one shop counter"/);
  assert.notEqual(second, first);
});

test("a too-short flag is rejected and does not write", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "hive-bad-"));
  const io = capture();
  const code = await runInit({
    cwd: dir,
    flags: { yes: true, tagline: "nope" },
    ...io,
    interactive: false,
  });
  assert.equal(code, 1);
  assert.match(io.read().err, /tagline is 4 characters/);
  assert.throws(() => readFileSync(path.join(dir, "HIVE.md")));
});

test("prompts use defaults and can skip help wanted", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "hive-ask-"));
  const answers = ["", "", "", "", "-", "", "skip", "y"];
  const rl = { question: async () => answers.shift() ?? "" };
  const io = capture();
  const code = await runInit({
    cwd: dir,
    flags: {},
    rl,
    ...io,
    interactive: true,
  });
  assert.equal(code, 0, io.read().err);
  const text = readFileSync(path.join(dir, "HIVE.md"), "utf8");
  assert.equal(text.includes("help_wanted"), false);
  const report = scoreText(text);
  assert.equal(report.hiveReady, true, report.errors.join("\n"));
  assert.equal(report.fields.help_wanted.status, "missing");
});

test("yaml quotes values that would break the header", () => {
  assert.equal(yamlScalar("plain words"), "plain words");
  assert.equal(yamlScalar("Hours: open"), '"Hours: open"');
});
