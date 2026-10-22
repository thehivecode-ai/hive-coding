import { readFileSync } from "node:fs";
import { parseHive, validateFields } from "./parse.js";
import { chars, LIMITS, MAX_FILE_BYTES, RUN_POINTS, TITLE_POINTS } from "./schema.js";

const FIELD_ORDER = ["tagline", "for", "problem", "help_wanted", "run", "title"];

const MISSING = {
  tagline: "Add tagline: what the project is, in one line (10 to 120 characters).",
  for: "Add for: who it is for (3 to 80 characters).",
  problem: "Add problem: the problem it solves (10 to 200 characters).",
  help_wanted: "Add help_wanted: what help you want right now (up to 200 characters).",
  run: "Add run: the commands to run it on your own computer (up to 20 lines).",
  title: "Add a Markdown title, a line like `# Project name`, under the header.",
};

export function scoreText(text, file = "HIVE.md") {
  const parsed = parseHive(text);
  if (!parsed.fields) {
    return {
      file,
      hiveReady: false,
      score: 0,
      fields: emptyFields(),
      deploy: { status: "missing", detail: "" },
      errors: parsed.errors,
      missing: [],
      notes: [],
    };
  }

  const { errors, cleaned } = validateFields(parsed.fields);
  const allErrors = [...parsed.errors, ...errors];
  const fields = {};
  const missing = [];
  let score = 0;

  for (const key of ["tagline", "for", "problem", "help_wanted"]) {
    const points = LIMITS[key].points;
    if (cleaned[key]) {
      score += points;
      fields[key] = {
        status: "pass",
        points,
        max: points,
        detail: `${chars(cleaned[key])} characters`,
      };
    } else if (hasFieldError(allErrors, key)) {
      fields[key] = { status: "fail", points: 0, max: points, detail: "" };
    } else {
      fields[key] = { status: "missing", points: 0, max: points, detail: "" };
      missing.push(MISSING[key]);
    }
  }

  if (cleaned.run) {
    const lineCount = cleaned.run.split("\n").length;
    score += RUN_POINTS;
    fields.run = {
      status: "pass",
      points: RUN_POINTS,
      max: RUN_POINTS,
      detail: `${lineCount} ${lineCount === 1 ? "line" : "lines"}`,
    };
  } else if (allErrors.some((item) => item.startsWith("run"))) {
    fields.run = { status: "fail", points: 0, max: RUN_POINTS, detail: "" };
  } else {
    fields.run = { status: "missing", points: 0, max: RUN_POINTS, detail: "" };
    missing.push(MISSING.run);
  }

  if (parsed.title) {
    score += TITLE_POINTS;
    fields.title = {
      status: "pass",
      points: TITLE_POINTS,
      max: TITLE_POINTS,
      detail: parsed.title,
    };
  } else {
    fields.title = { status: "missing", points: 0, max: TITLE_POINTS, detail: "" };
    missing.push(MISSING.title);
  }

  let deploy;
  if (cleaned.deploy) {
    deploy = { status: "pass", detail: cleaned.deploy.join(", ") };
  } else if (allErrors.some((item) => item.startsWith("deploy"))) {
    deploy = { status: "fail", detail: "" };
  } else {
    deploy = { status: "optional", detail: "not set" };
  }

  const notes = [];
  if (parsed.unknown.length === 1 && parsed.unknown[0] === "license") {
    notes.push("Ignored license. The Hive Code reads the license from GitHub, not from HIVE.md.");
  } else if (parsed.unknown.length > 0) {
    const names = parsed.unknown.map((name) => `\`${name}\``).join(", ");
    notes.push(
      `Ignored ${names}. The header uses tagline, for, problem, help_wanted, run, and deploy.`,
    );
  }
  notes.push("check does not run the commands in this file.");

  return {
    file,
    hiveReady: allErrors.length === 0,
    score,
    fields,
    deploy,
    errors: allErrors,
    missing,
    notes,
    order: FIELD_ORDER,
  };
}

function hasFieldError(errors, key) {
  return errors.some((item) => item === key || item.startsWith(`${key} `) || item.startsWith(`${key} is`));
}

function emptyFields() {
  const fields = {};
  for (const key of ["tagline", "for", "problem", "help_wanted"]) {
    fields[key] = { status: "missing", points: 0, max: LIMITS[key].points, detail: "" };
  }
  fields.run = { status: "missing", points: 0, max: RUN_POINTS, detail: "" };
  fields.title = { status: "missing", points: 0, max: TITLE_POINTS, detail: "" };
  return fields;
}

function blocked(file, message) {
  return {
    file,
    hiveReady: false,
    score: 0,
    fields: emptyFields(),
    deploy: { status: "missing", detail: "" },
    errors: [message],
    missing: [],
    notes: [],
  };
}

export function scoreFile(filePath) {
  let text;
  try {
    const buffer = readFileSync(filePath);
    if (buffer.length > MAX_FILE_BYTES) {
      return blocked(
        filePath,
        `${filePath} is over ${MAX_FILE_BYTES} bytes. A HIVE.md is a short file.`,
      );
    }
    text = buffer.toString("utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return blocked(filePath, `No file at ${filePath}. Create one with \`thehivecode init\`.`);
    }
    if (error && (error.code === "EISDIR" || error.code === "EACCES")) {
      return blocked(filePath, `Could not read ${filePath}.`);
    }
    throw error;
  }
  return scoreText(text, filePath);
}

export function formatReport(report) {
  const lines = [];
  lines.push(report.file);
  lines.push(`hive-ready: ${report.hiveReady ? "yes" : "no"}`);
  lines.push(`score: ${report.score}/100`);
  lines.push("");
  for (const key of FIELD_ORDER) {
    const field = report.fields[key];
    const detail = field.detail ? `  ${field.detail}` : "";
    lines.push(`  ${key.padEnd(12)}${field.status.padEnd(8)}${detail}`);
  }
  const deployDetail = report.deploy.detail ? `  ${report.deploy.detail}` : "";
  lines.push(`  ${"deploy".padEnd(12)}${report.deploy.status.padEnd(8)}${deployDetail}`);
  lines.push("");
  lines.push("fixes");
  const fixes = [...report.errors, ...report.missing];
  if (fixes.length === 0) lines.push("  none");
  else for (const fix of fixes) lines.push(`  ${fix}`);
  if (report.notes.length > 0) {
    lines.push("");
    lines.push("notes");
    for (const note of report.notes) lines.push(`  ${note}`);
  }
  lines.push("");
  return lines.join("\n");
}
