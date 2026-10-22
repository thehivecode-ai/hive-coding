// Field limits from https://thehivecode.ai/learn/hive-md
// Lengths are inclusive. All fields are optional on the page.
// Points are this tool's hive-ready score, not part of the format.

export const LIMITS = {
  tagline: { min: 10, max: 120, points: 25 },
  for: { min: 3, max: 80, points: 15 },
  problem: { min: 10, max: 200, points: 25 },
  help_wanted: { min: 1, max: 200, points: 15 },
};

export const RUN_MAX_LINES = 20;
export const RUN_POINTS = 15;
export const TITLE_POINTS = 5;
export const DEPLOY_TARGETS = ["vercel", "netlify"];

export const HEADER_FIELDS = [
  "tagline",
  "for",
  "problem",
  "help_wanted",
  "run",
  "deploy",
];

export const MAX_FILE_BYTES = 1_000_000;

export function chars(value) {
  return Array.from(value).length;
}
