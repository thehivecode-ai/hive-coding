import { chars, DEPLOY_TARGETS, HEADER_FIELDS, LIMITS, RUN_MAX_LINES } from "./schema.js";

const KNOWN = new Set(HEADER_FIELDS);

export function parseHive(text) {
  if (typeof text !== "string") {
    return fail("HIVE.md must be text.");
  }
  const src = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const split = splitFrontMatter(src);
  if (split.error) return fail(split.error);

  const header = parseHeader(split.header);
  if (header.errors.length > 0 && header.fields == null) {
    return fail(header.errors[0], header.errors);
  }

  const title = findTitle(split.body);
  return {
    ok: header.errors.length === 0,
    errors: header.errors,
    fields: header.fields,
    unknown: header.unknown,
    title,
    body: split.body,
  };
}

function fail(message, errors = [message]) {
  return { ok: false, errors, fields: null, unknown: [], title: null, body: "" };
}

function splitFrontMatter(src) {
  if (!src.startsWith("---\n") && src !== "---") {
    return {
      error:
        "HIVE.md must start with a --- line, then the header, then a closing --- line.",
    };
  }
  const lines = src.split("\n");
  if (lines[0] !== "---") {
    return {
      error:
        "HIVE.md must start with a --- line, then the header, then a closing --- line.",
    };
  }
  const headerLines = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") {
      return { header: headerLines.join("\n"), body: lines.slice(i + 1).join("\n") };
    }
    headerLines.push(lines[i]);
  }
  return { error: "HIVE.md is missing the closing --- line of the header." };
}

function parseHeader(header) {
  const fields = {};
  const unknown = [];
  const errors = [];
  const lines = header.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "" || /^\s*#/.test(line)) {
      i++;
      continue;
    }
    const match = line.match(/^([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*)$/);
    if (!match) {
      errors.push(`Could not read this header line: ${line.trim()}`);
      i++;
      continue;
    }
    const key = match[1];
    const raw = match[2];
    let value;

    if (raw === "|" || raw === "|-" || raw === "|+" || raw === ">" || raw === ">-" || raw === ">+") {
      const block = [];
      i++;
      while (i < lines.length && (lines[i] === "" || /^[ \t]/.test(lines[i]))) {
        block.push(lines[i]);
        i++;
      }
      value = dedentBlock(block, raw);
    } else {
      value = unquote(raw.trim());
      i++;
    }

    if (Object.prototype.hasOwnProperty.call(fields, key) || unknown.includes(key)) {
      errors.push(`\`${key}\` is set twice. Keep one.`);
      continue;
    }
    if (!KNOWN.has(key)) {
      unknown.push(key);
      continue;
    }
    fields[key] = value;
  }

  return { fields, unknown, errors };
}

function dedentBlock(block, indicator) {
  const indents = [];
  for (const line of block) {
    if (line.trim() === "") continue;
    const indent = line.match(/^[ \t]*/)[0];
    indents.push(indent.length);
  }
  const min = indents.length > 0 ? Math.min(...indents) : 0;
  let text = block
    .map((line) => (line.trim() === "" ? "" : line.slice(min)))
    .join("\n")
    .replace(/\n$/, "");
  if (indicator.startsWith(">")) {
    text = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "")
      .join(" ");
  }
  return text;
}

export function unquote(value) {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === "string" ? parsed : value;
    } catch {
      return value;
    }
  }
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }
  return value;
}

export function findTitle(body) {
  let fence = false;
  for (const line of body.split("\n")) {
    if (line.trim().startsWith("```")) {
      fence = !fence;
      continue;
    }
    if (fence) continue;
    const match = line.match(/^#\s+(\S.*?)\s*$/);
    if (match) return match[1];
  }
  return null;
}

export function parseDeploy(raw) {
  const text = raw.trim();
  if (text.startsWith("[") && text.endsWith("]")) {
    const inner = text.slice(1, -1).trim();
    if (inner === "") return [];
    return inner
      .split(",")
      .map((part) => unquote(part.trim()))
      .filter((part) => part !== "");
  }
  if (text === "") return [];
  return [unquote(text)];
}

export function validateFields(fields) {
  const errors = [];
  const cleaned = {};

  for (const key of ["tagline", "for", "problem", "help_wanted"]) {
    if (!Object.prototype.hasOwnProperty.call(fields, key)) continue;
    const value = fields[key];
    if (typeof value !== "string" || value.trim() === "") {
      errors.push(emptyField(key));
      continue;
    }
    if (value.includes("\n")) {
      errors.push(`${key} must be a single line.`);
      continue;
    }
    const control = controlChar(value);
    if (control) {
      errors.push(`${key} contains a control character.`);
      continue;
    }
    const trimmed = value.trim();
    const length = chars(trimmed);
    const { min, max } = LIMITS[key];
    if (length < min || length > max) {
      errors.push(lengthError(key, length, min, max));
      continue;
    }
    cleaned[key] = trimmed;
  }

  if (Object.prototype.hasOwnProperty.call(fields, "run")) {
    const value = fields.run;
    if (typeof value !== "string" || value.trim() === "") {
      errors.push("run has no commands. Remove it, or add up to 20 lines.");
    } else if (controlChar(value)) {
      errors.push("run contains a control character.");
    } else {
      const lines = value.split("\n");
      if (lines.length > RUN_MAX_LINES) {
        errors.push(
          `run is ${lines.length} lines. Keep it to ${RUN_MAX_LINES} lines.`,
        );
      } else {
        cleaned.run = value;
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(fields, "deploy")) {
    const targets = parseDeploy(String(fields.deploy));
    if (targets.length === 0) {
      errors.push("deploy is empty. Remove it, or set vercel, netlify, or both.");
    } else {
      const seen = new Set();
      const bad = [];
      let duplicate = false;
      for (const target of targets) {
        if (!DEPLOY_TARGETS.includes(target)) bad.push(target);
        if (seen.has(target)) duplicate = true;
        seen.add(target);
      }
      if (duplicate) {
        errors.push("deploy lists a target twice. List each of vercel and netlify once.");
      }
      if (bad.length > 0) {
        const names = bad.map((item) => `\`${item}\``).join(", ");
        errors.push(`deploy has ${names}. Use vercel, netlify, or both.`);
      }
      if (bad.length === 0 && !duplicate) cleaned.deploy = targets;
    }
  }

  return { errors, cleaned };
}

function emptyField(key) {
  if (key === "help_wanted") {
    return "help_wanted is empty. Remove it, or write up to 200 characters.";
  }
  const { min, max } = LIMITS[key];
  return `${key} is empty. Use ${min} to ${max} characters, or remove it.`;
}

function lengthError(key, length, min, max) {
  if (key === "help_wanted") {
    return `help_wanted is ${length} characters. The maximum is ${max}.`;
  }
  return `${key} is ${length} characters. Use ${min} to ${max}.`;
}

function controlChar(value) {
  return /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value);
}

export { LIMITS, RUN_MAX_LINES };
