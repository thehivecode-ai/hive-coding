import { readFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout as processStdout, stderr as processStderr } from "node:process";
import { formatReport, scoreFile } from "./score.js";
import { runInit } from "./init.js";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

const BOOL = new Set(["yes", "force", "json", "stdout", "help", "version", "strict"]);
const SHORT = { y: "yes", f: "force", h: "help", v: "version" };
const OPTIONS = new Set([
  "tagline",
  "for",
  "problem",
  "helpWanted",
  "title",
  "file",
  "run",
  "deploy",
]);

export async function main(argv, io = {}) {
  const stdout = io.stdout || processStdout;
  const stderr = io.stderr || processStderr;
  const input = io.stdin || stdin;
  let flags;
  try {
    flags = parseArgs(argv);
  } catch (error) {
    stderr.write(`${error.message}\n`);
    return 1;
  }

  if (flags.version) {
    stdout.write(`${pkg.version}\n`);
    return 0;
  }
  if (flags.help || flags._.length === 0) {
    stdout.write(helpText());
    return 0;
  }

  const [command, extra] = flags._;
  if (extra) {
    stderr.write(`Unexpected argument \`${extra}\`.\n`);
    return 1;
  }
  if (command === "help") {
    stdout.write(helpText());
    return 0;
  }
  if (command === "check") {
    const cwd = io.cwd || process.cwd();
    const requested = flags.file || "HIVE.md";
    const report = scoreFile(path.resolve(cwd, requested));
    report.file = requested;
    if (flags.json) stdout.write(`${JSON.stringify(toJson(report), null, 2)}\n`);
    else stdout.write(formatReport(report));
    if (!report.hiveReady) return 1;
    if (flags.strict && report.score < 100) return 1;
    return 0;
  }
  if (command === "init") {
    const interactive = io.interactive ?? Boolean(input.isTTY);
    let rl = io.rl;
    let created = false;
    if (!rl && interactive && !flags.yes) {
      rl = createInterface({ input, output: stdout });
      created = true;
    }
    try {
      return await runInit({
        cwd: io.cwd || process.cwd(),
        flags,
        rl,
        stdout,
        stderr,
        interactive,
      });
    } finally {
      if (created) rl.close();
    }
  }

  stderr.write(`Unknown command \`${command}\`.\n\n`);
  stdout.write(helpText());
  return 1;
}

export function parseArgs(argv) {
  const flags = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--") {
      flags._.push(...argv.slice(i + 1));
      break;
    }
    if (arg.startsWith("--")) {
      let key = arg.slice(2);
      let inline;
      const eq = key.indexOf("=");
      if (eq !== -1) {
        inline = key.slice(eq + 1);
        key = key.slice(0, eq);
      }
      const name = key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      if (BOOL.has(name)) {
        if (inline != null) throw new Error(`--${key} does not take a value.`);
        flags[name] = true;
        continue;
      }
      if (!OPTIONS.has(name)) throw new Error(`Unknown option \`--${key}\`.`);
      const value = inline != null ? inline : argv[++i];
      if (value == null || (inline == null && value.startsWith("-"))) {
        throw new Error(`--${key} needs a value.`);
      }
      if (name === "run") {
        flags.run = flags.run || [];
        for (const line of value.split(/\r?\n|\\n/)) {
          const trimmed = line.trim();
          if (trimmed) flags.run.push(trimmed);
        }
      } else if (name === "deploy") {
        flags.deploy = flags.deploy || [];
        flags.deploy.push(value);
      } else {
        flags[name] = value;
      }
      continue;
    }
    if (/^-[a-zA-Z]$/.test(arg)) {
      const name = SHORT[arg[1]];
      if (!name) throw new Error(`Unknown option \`${arg}\`.`);
      flags[name] = true;
      continue;
    }
    if (arg.startsWith("-")) throw new Error(`Unknown option \`${arg}\`.`);
    flags._.push(arg);
  }
  return flags;
}

function toJson(report) {
  return {
    file: report.file,
    hiveReady: report.hiveReady,
    score: report.score,
    maxScore: 100,
    fields: report.fields,
    deploy: report.deploy,
    errors: report.errors,
    missing: report.missing,
    notes: report.notes,
  };
}

function helpText() {
  return `thehivecode ${pkg.version}
Write and check a HIVE.md. The format is specified at
https://thehivecode.ai/learn/hive-md

Usage
  thehivecode init [--yes] [--force] [--file HIVE.md]
  thehivecode check [--file HIVE.md] [--json] [--strict]
  thehivecode --help
  thehivecode --version

init asks for a name, a tagline, who it is for, the problem, the help
you want, how to run it, and an optional deploy target. Enter accepts
the default in brackets. --yes writes those defaults without asking
and will not replace an existing file unless you also pass --force.

check reads HIVE.md and prints a hive-ready score from 0 to 100.
The file is hive-ready when the header parses and every field you set
is within the limits below. The score is how many recommended fields
are filled in. deploy is optional and is not part of the score.
Exit 0 when the file is hive-ready. --strict also requires a score of 100.
This command never runs the commands in the file.

Fields
  tagline        10 to 120 characters
  for            3 to 80 characters
  problem        10 to 200 characters
  help_wanted    up to 200 characters
  run            up to 20 lines
  deploy         vercel, netlify, or both

Options
  --yes, -y            Accept defaults
  --force, -f          Replace an existing HIVE.md
  --file <path>        Read or write this path instead of ./HIVE.md
  --title <text>       Project name, used as the Markdown title
  --tagline <text>
  --for <text>
  --problem <text>
  --help-wanted <text> Use - to leave help_wanted out
  --run <command>      Repeat for each command, or separate lines with \\n
  --deploy <target>    vercel, netlify, both, or skip
  --stdout             Print the file instead of writing it
  --json               Print the check result as JSON
  --strict             With check, exit 1 unless the score is 100
`;
}
