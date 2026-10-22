import assert from "node:assert/strict";
import { test } from "node:test";
import { parseHive, validateFields } from "../src/parse.js";

const chair = `---
tagline: Booking for barbers that texts the waitlist when a chair opens
for: Barbers and small salons
problem: Chairs sit empty when a client cancels late
help_wanted: A tester with a real shop, and someone for the waitlist texts
run: |
  npm install
  npm run dev
deploy: [vercel]
---

# Chair Alert

Say more here.
`;

test("parses the guide template", () => {
  const parsed = parseHive(chair);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.title, "Chair Alert");
  const { errors, cleaned } = validateFields(parsed.fields);
  assert.deepEqual(errors, []);
  assert.equal(cleaned.tagline.startsWith("Booking for barbers"), true);
  assert.equal(cleaned.run, "npm install\nnpm run dev");
  assert.deepEqual(cleaned.deploy, ["vercel"]);
});

test("ignores comments, unknown fields, and a BOM", () => {
  const text =
    "\uFEFF---\n" +
    "# comment\n" +
    "tagline: Booking for barbers that texts the waitlist when a chair opens\n" +
    "license: MIT\n" +
    "for: Barbers and small salons\n" +
    "---\n\n# Name\n";
  const parsed = parseHive(text.replace(/\n/g, "\r\n"));
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.unknown, ["license"]);
  assert.equal(parsed.fields.license, undefined);
  assert.equal(parsed.title, "Name");
});

test("rejects a missing closer, a short tagline, and a bad deploy target", () => {
  assert.equal(parseHive("# No header\n").ok, false);
  assert.match(parseHive("---\ntagline: hi\n").errors[0], /closing/);

  const parsed = parseHive("---\ntagline: short\ndeploy: [heroku ]\n---\n");
  const { errors } = validateFields(parsed.fields);
  assert.match(errors.join("\n"), /tagline is 5 characters/);
  assert.match(errors.join("\n"), /heroku/);
});

test("counts run lines and accepts both deploy targets in either order", () => {
  const lines = Array.from({ length: 21 }, (_, i) => `  echo ${i}`).join("\n");
  const tooMany = parseHive(`---\nrun: |\n${lines}\n---\n`);
  assert.match(validateFields(tooMany.fields).errors.join("\n"), /21 lines/);

  const both = parseHive("---\ndeploy: [netlify, vercel]\n---\n");
  assert.deepEqual(validateFields(both.fields).cleaned.deploy, ["netlify", "vercel"]);
});

test("unquotes a tagline that contains a colon", () => {
  const parsed = parseHive('---\ntagline: "Hours: open or closed from a file today"\n---\n');
  assert.equal(
    validateFields(parsed.fields).cleaned.tagline,
    "Hours: open or closed from a file today",
  );
});

test("does not treat a heading inside a fence as the title", () => {
  const parsed = parseHive("---\n---\n\n```\n# not the title\n```\n\n# Real title\n");
  assert.equal(parsed.title, "Real title");
});
