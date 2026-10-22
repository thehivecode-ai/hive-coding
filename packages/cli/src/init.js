import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chars, LIMITS, RUN_MAX_LINES } from "./schema.js";
import { formatReport, scoreText } from "./score.js";

export function humanize(name) {
  const cleaned = String(name).replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return "This project";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function projectDefaults(cwd) {
  const pkg = readPackage(cwd);
  let rawName = path.basename(cwd);
  if (pkg && typeof pkg.name === "string" && pkg.name.trim()) {
    rawName = pkg.name.split("/").pop();
  }
  const title = fit(humanize(rawName), 1, 80, "This project");
  let tagline = `${title} for the people who use it`;
  if (pkg && typeof pkg.description === "string") {
    const description = pkg.description.trim();
    if (within(description, LIMITS.tagline.min, LIMITS.tagline.max)) tagline = description;
  }
  tagline = fit(tagline, LIMITS.tagline.min, LIMITS.tagline.max, "A project for the people who use it");
  const audience = fit(`People who use ${title}`, LIMITS.for.min, LIMITS.for.max, "People who use this project");
  const problem = "There is no public queue yet for what to build next";
  const helpWanted = "People who will use it and say what is missing";
  return {
    title,
    tagline,
    for: audience,
    problem,
    helpWanted,
    run: detectRun(cwd, pkg),
    deploy: detectDeploy(cwd),
  };
}

export function renderHive(doc) {
  const lines = ["---"];
  if (doc.tagline) lines.push(`tagline: ${yamlScalar(doc.tagline)}`);
  if (doc.for) lines.push(`for: ${yamlScalar(doc.for)}`);
  if (doc.problem) lines.push(`problem: ${yamlScalar(doc.problem)}`);
  if (doc.helpWanted) lines.push(`help_wanted: ${yamlScalar(doc.helpWanted)}`);
  if (doc.run) {
    lines.push("run: |");
    for (const line of String(doc.run).split("\n")) lines.push(`  ${line}`);
  }
  if (doc.deploy && doc.deploy.length > 0) {
    lines.push(`deploy: [${doc.deploy.join(", ")}]`);
  }
  lines.push("---", "", `# ${doc.title}`, "");
  lines.push(bodyFor(doc).trimEnd(), "");
  return lines.join("\n");
}

export function yamlScalar(value) {
  if (
    /[\n\r]/.test(value) ||
    /[:#&*!|>'"%@`[\]{},]/.test(value) ||
    /^\s|\s$/.test(value) ||
    /^(true|false|null|yes|no|~)$/i.test(value)
  ) {
    return JSON.stringify(value);
  }
  return value;
}

export async function runInit({
  cwd,
  flags,
  rl,
  stdout,
  stderr,
  interactive = false,
}) {
  const file = path.resolve(cwd, flags.file || "HIVE.md");
  const defaults = projectDefaults(cwd);
  if (flags.deploy) {
    const parsed = normalizeDeploy(flags.deploy);
    if (parsed.error) {
      stderr.write(`${parsed.error}\n`);
      return 1;
    }
    flags = { ...flags, deploy: parsed.targets };
  }
  let doc;

  if (flags.yes || !interactive) {
    if (!flags.yes && !interactive && !hasScriptedFields(flags)) {
      stderr.write(
        "No terminal to ask questions. Re-run with --yes, or pass --tagline, --for, and --problem.\n",
      );
      return 1;
    }
    const built = applyFlags(defaults, flags);
    if (built.error) {
      stderr.write(`${built.error}\n`);
      return 1;
    }
    doc = built.doc;
  } else {
    doc = await promptDoc({ rl, stdout, defaults, flags });
    const answer = (await rl.question("Write the file? [Y/n] ")).trim().toLowerCase();
    if (answer === "n" || answer === "no") {
      stdout.write("Left the directory unchanged.\n");
      return 0;
    }
  }

  const text = renderHive(doc);
  const report = scoreText(text, path.basename(file));
  if (!report.hiveReady) {
    stderr.write(formatReport(report));
    return 1;
  }
  if (flags.stdout) {
    stdout.write(text);
    return 0;
  }
  if (existsSync(file) && !flags.force) {
    stderr.write(`${path.basename(file)} already exists. Pass --force to replace it.\n`);
    return 1;
  }
  writeFileSync(file, text);
  stdout.write(`Wrote ${path.relative(cwd, file) || path.basename(file)}\n`);
  stdout.write(`hive-ready: yes\n`);
  stdout.write(`score: ${report.score}/100\n`);
  if (report.missing.length > 0) stdout.write(formatReport(report));
  return 0;
}

function hasScriptedFields(flags) {
  return Boolean(flags.tagline && flags.for && flags.problem);
}

function applyFlags(defaults, flags) {
  const doc = {
    title: flags.title || defaults.title,
    tagline: flags.tagline || defaults.tagline,
    for: flags.for || defaults.for,
    problem: flags.problem || defaults.problem,
    helpWanted:
      flags.helpWanted === "-" ? "" : flags.helpWanted || defaults.helpWanted,
    run: flags.run ? flags.run.join("\n") : defaults.run,
    deploy: flags.deploy || defaults.deploy,
  };
  if (!doc.title.trim()) return { error: "A project name is required." };
  return { doc };
}

async function promptDoc({ rl, stdout, defaults, flags }) {
  const title =
    flags.title ||
    (await askBounded(rl, stdout, {
      label: "Project name",
      def: defaults.title,
      min: 1,
      max: 80,
    }));
  const tagline =
    flags.tagline ||
    (await askBounded(rl, stdout, {
      label: "Tagline",
      def: defaults.tagline,
      min: LIMITS.tagline.min,
      max: LIMITS.tagline.max,
    }));
  const audience =
    flags.for ||
    (await askBounded(rl, stdout, {
      label: "Who it is for",
      def: defaults.for,
      min: LIMITS.for.min,
      max: LIMITS.for.max,
    }));
  const problem =
    flags.problem ||
    (await askBounded(rl, stdout, {
      label: "Problem it solves",
      def: defaults.problem,
      min: LIMITS.problem.min,
      max: LIMITS.problem.max,
    }));
  let helpWanted = flags.helpWanted;
  if (helpWanted == null) {
    helpWanted = await askBounded(rl, stdout, {
      label: "Help wanted (- to skip)",
      def: defaults.helpWanted,
      min: LIMITS.help_wanted.min,
      max: LIMITS.help_wanted.max,
      skip: "-",
    });
  } else if (helpWanted === "-") {
    helpWanted = "";
  }
  const run = flags.run
    ? flags.run.join("\n")
    : await askRun(rl, stdout, defaults.run);
  const deploy = flags.deploy || (await askDeploy(rl, stdout, defaults.deploy));
  return { title, tagline, for: audience, problem, helpWanted, run, deploy };
}

async function askBounded(rl, stdout, { label, def, min, max, skip }) {
  while (true) {
    const hint = def ? ` [${def}]` : "";
    const raw = (await rl.question(`${label}${hint}: `)).trim();
    if (skip && raw === skip) return "";
    const value = raw === "" ? def || "" : raw;
    if (!value) {
      stdout.write("Enter a value.\n");
      continue;
    }
    const length = chars(value);
    if (length < min) {
      stdout.write(`${length} characters is short. Use at least ${min}.\n`);
      continue;
    }
    if (length > max) {
      stdout.write(`${length} characters is long. Use at most ${max}.\n`);
      continue;
    }
    return value;
  }
}

async function askRun(rl, stdout, fallback) {
  stdout.write("Commands to run it locally. One per line. An empty line finishes.\n");
  if (fallback) {
    stdout.write("Press enter on the first line to keep:\n");
    for (const line of fallback.split("\n")) stdout.write(`  ${line}\n`);
  } else {
    stdout.write("Press enter on the first line to skip.\n");
  }
  const lines = [];
  while (lines.length < RUN_MAX_LINES) {
    const answer = (await rl.question("> ")).trim();
    if (answer === "") return lines.length === 0 ? fallback || "" : lines.join("\n");
    lines.push(answer);
  }
  const extra = (await rl.question("> ")).trim();
  if (extra) {
    stdout.write(`Stopped at ${RUN_MAX_LINES} lines.\n`);
  }
  return lines.join("\n");
}

async function askDeploy(rl, stdout, fallback) {
  const shown = fallback.length > 0 ? fallback.join(", ") : "skip";
  while (true) {
    const raw = (
      await rl.question(`Deploy target: vercel, netlify, both, or skip [${shown}]: `)
    )
      .trim()
      .toLowerCase();
    const parsed = normalizeDeploy([raw === "" ? shown : raw]);
    if (parsed.error) {
      stdout.write("Use vercel, netlify, both, or skip.\n");
      continue;
    }
    return parsed.targets;
  }
}

function normalizeDeploy(values) {
  const targets = [];
  for (const value of values) {
    const text = String(value).trim().toLowerCase();
    if (text === "" || text === "skip" || text === "none") continue;
    if (text === "both" || text === "vercel, netlify" || text === "netlify, vercel") {
      targets.push("vercel", "netlify");
      continue;
    }
    for (const part of text.split(",").map((item) => item.trim()).filter(Boolean)) {
      if (part !== "vercel" && part !== "netlify") {
        return { error: `deploy has \`${part}\`. Use vercel, netlify, or both.` };
      }
      targets.push(part);
    }
  }
  const unique = [];
  for (const target of targets) {
    if (!unique.includes(target)) unique.push(target);
  }
  return { targets: unique };
}

function bodyFor(doc) {
  const sentence = /[.!?]$/.test(doc.tagline) ? doc.tagline : `${doc.tagline}.`;
  const help = doc.helpWanted
    ? `How to help: ${doc.helpWanted}`
    : "How to help: say what is missing, in public.";
  return [
    sentence,
    "",
    "Replace this with what the project does today and what is next.",
    "",
    help,
  ].join("\n");
}

function readPackage(cwd) {
  const pkgPath = path.join(cwd, "package.json");
  if (!existsSync(pkgPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(pkgPath, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function detectRun(cwd, pkg) {
  const has = (file) => existsSync(path.join(cwd, file));
  if (pkg) {
    const scripts = pkg.scripts && typeof pkg.scripts === "object" ? pkg.scripts : {};
    let runner = "npm";
    if (has("pnpm-lock.yaml")) runner = "pnpm";
    else if (has("yarn.lock")) runner = "yarn";
    else if (has("bun.lock") || has("bun.lockb")) runner = "bun";
    const lines = [`${runner} install`];
    if (scripts.dev) lines.push(runner === "npm" ? "npm run dev" : `${runner} dev`);
    else if (scripts.start) lines.push(runner === "npm" ? "npm start" : `${runner} start`);
    else lines.push(runner === "npm" ? "npm test" : `${runner} test`);
    return lines.join("\n");
  }
  if (has("Cargo.toml")) return "cargo run";
  if (has("go.mod")) return "go run .";
  if (has("requirements.txt")) return "python -m pip install -r requirements.txt";
  if (has("pyproject.toml")) return "python -m pip install -e .";
  return "";
}

function detectDeploy(cwd) {
  const has = (file) => existsSync(path.join(cwd, file));
  const targets = [];
  if (has("vercel.json")) targets.push("vercel");
  if (has("netlify.toml")) targets.push("netlify");
  return targets;
}

function within(value, min, max) {
  if (!value || value.includes("\n")) return false;
  const length = chars(value);
  return length >= min && length <= max;
}

function fit(value, min, max, fallback) {
  let text = String(value).trim();
  if (chars(text) > max) text = Array.from(text).slice(0, max).join("").trim();
  if (chars(text) < min) text = fallback;
  if (chars(text) > max) text = Array.from(text).slice(0, max).join("").trim();
  return text;
}
