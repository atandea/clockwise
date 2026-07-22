/**
 * generate-changelog.mjs
 *
 * Generates a structured changelog from git commit messages between the two
 * most recent `app-v*` tags (or from the latest tag to HEAD when --unreleased
 * is passed).
 *
 * Usage:
 *   node scripts/generate-changelog.mjs                # between last two tags
 *   node scripts/generate-changelog.mjs --unreleased   # from latest tag to HEAD
 *   node scripts/generate-changelog.mjs --from app-v1.0.0 --to app-v1.0.3
 *
 * Outputs:
 *   CHANGELOG.md   — human-readable markdown (stdout or file)
 *   changelog.json — machine-readable JSON (always written to cwd)
 */

import { execSync } from "child_process";
import { writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const flagIndex = (flag) => args.indexOf(flag);

const unreleased = args.includes("--unreleased");
const outputDir = (() => {
  const i = flagIndex("--output");
  return i !== -1 && args[i + 1] ? path.resolve(args[i + 1]) : repoRoot;
})();

let fromRef = (() => {
  const i = flagIndex("--from");
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
})();

let toRef = (() => {
  const i = flagIndex("--to");
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
})();

// ---------------------------------------------------------------------------
// Git helpers
// ---------------------------------------------------------------------------
function git(cmd) {
  return execSync(cmd, { cwd: repoRoot, encoding: "utf8" }).trim();
}

function getTags() {
  try {
    const raw = git("git tag -l 'app-v*' --sort=-version:refname");
    return raw ? raw.split("\n").filter(Boolean) : [];
  } catch {
    return [];
  }
}

function getCommitsBetween(from, to) {
  const range = from ? `${from}..${to}` : to;
  const SEP = "<<SEP>>";
  const format = `--format=%H${SEP}%s${SEP}%an${SEP}%aI`;
  try {
    const raw = git(`git log "${format}" ${range}`);
    return raw
      ? raw.split("\n").filter(Boolean).map((line) => parseCommitLine(line, SEP))
      : [];
  } catch {
    return [];
  }
}

function parseCommitLine(line, sep) {
  const [hash, subject, author, date] = line.split(sep);
  return { hash: hash?.slice(0, 7), subject, author, date };
}

// ---------------------------------------------------------------------------
// Conventional commit parser
// ---------------------------------------------------------------------------
const COMMIT_PATTERN = /^(\w+)(?:\(([^)]+)\))?:\s*(.+)$/;

const TYPE_LABELS = {
  feat: { emoji: "🚀", heading: "New Features" },
  fix: { emoji: "🐛", heading: "Bug Fixes" },
  refactor: { emoji: "🔧", heading: "Improvements" },
  perf: { emoji: "⚡", heading: "Performance" },
  style: { emoji: "🎨", heading: "Styling" },
  docs: { emoji: "📝", heading: "Documentation" },
  test: { emoji: "🧪", heading: "Tests" },
  ci: { emoji: "🏗️", heading: "CI / Build" },
  chore: { emoji: "🧹", heading: "Chores" },
  other: { emoji: "📦", heading: "Other Changes" },
};

// Types hidden from user-facing changelog (still kept in JSON)
const HIDDEN_TYPES = new Set(["ci", "docs", "test"]);

function categorize(commit) {
  const match = commit.subject.match(COMMIT_PATTERN);
  if (match) {
    const [, type, scope, message] = match;
    const normalizedType = type.toLowerCase();
    return {
      type: normalizedType in TYPE_LABELS ? normalizedType : "other",
      scope: scope || null,
      message: message.trim(),
      hash: commit.hash,
      author: commit.author,
      date: commit.date,
    };
  }
  return {
    type: "other",
    scope: null,
    message: commit.subject,
    hash: commit.hash,
    author: commit.author,
    date: commit.date,
  };
}

// ---------------------------------------------------------------------------
// Determine range
// ---------------------------------------------------------------------------
const tags = getTags();

if (!fromRef && !toRef) {
  if (unreleased) {
    fromRef = tags[0] || null;
    toRef = "HEAD";
  } else if (tags.length >= 2) {
    fromRef = tags[1];
    toRef = tags[0];
  } else if (tags.length === 1) {
    fromRef = null; // from the beginning of history
    toRef = tags[0];
  } else {
    fromRef = null;
    toRef = "HEAD";
  }
}

const version = (() => {
  if (toRef && toRef !== "HEAD") {
    return toRef.replace(/^app-v/, "");
  }
  // Read from package.json for unreleased
  try {
    const pkgPath = path.join(repoRoot, "clockwise-dashboard", "package.json");
    const pkg = JSON.parse(
      execSync(`cat "${pkgPath}"`, { encoding: "utf8" })
    );
    return pkg.version || "unreleased";
  } catch {
    return "unreleased";
  }
})();

const releaseDate = (() => {
  if (toRef && toRef !== "HEAD") {
    try {
      return git(`git log -1 --format=%aI ${toRef}`).slice(0, 10);
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  }
  return new Date().toISOString().slice(0, 10);
})();

console.log(
  `Generating changelog: ${fromRef || "(start)"} → ${toRef} (v${version})`
);

// ---------------------------------------------------------------------------
// Collect and categorize commits
// ---------------------------------------------------------------------------
const rawCommits = getCommitsBetween(fromRef, toRef);
let entries = rawCommits.map(categorize);

// Merge dependency update commits
const depUpdateEntries = [];
for (const entry of entries) {
  const msg = entry.message.toLowerCase();
  const isDep =
    msg.includes("dependencies update") ||
    msg.includes("update dependencies") ||
    entry.scope === "deps" ||
    msg.startsWith("bump ");
  if (isDep) {
    depUpdateEntries.push(entry);
  }
}

if (depUpdateEntries.length > 0) {
  const baseEntry = depUpdateEntries[0];
  const uniqueHashes = [...new Set(depUpdateEntries.map((e) => e.hash))].filter(Boolean);
  const hash = uniqueHashes.join(", ");

  const mergedEntry = {
    type: "chore",
    scope: null,
    message: "dependencies update",
    hash,
    author: baseEntry.author,
    date: baseEntry.date,
  };

  let mergedAdded = false;
  const mergedEntries = [];
  for (const entry of entries) {
    const msg = entry.message.toLowerCase();
    const isDep =
      msg.includes("dependencies update") ||
      msg.includes("update dependencies") ||
      entry.scope === "deps" ||
      msg.startsWith("bump ");
    if (isDep) {
      if (!mergedAdded) {
        mergedEntries.push(mergedEntry);
        mergedAdded = true;
      }
    } else {
      mergedEntries.push(entry);
    }
  }
  entries = mergedEntries;
}

// Group by type
const grouped = {};
for (const entry of entries) {
  if (!grouped[entry.type]) grouped[entry.type] = [];
  grouped[entry.type].push(entry);
}

// ---------------------------------------------------------------------------
// Generate markdown
// ---------------------------------------------------------------------------
const typeOrder = [
  "feat",
  "fix",
  "refactor",
  "perf",
  "style",
  "docs",
  "test",
  "ci",
  "chore",
  "other",
];

let md = `## v${version} — ${releaseDate}\n\n`;

let visibleCount = 0;
for (const type of typeOrder) {
  if (!grouped[type] || HIDDEN_TYPES.has(type)) continue;
  const { emoji, heading } = TYPE_LABELS[type];
  md += `### ${emoji} ${heading}\n\n`;
  for (const entry of grouped[type]) {
    const scope = entry.scope ? `**${entry.scope}:** ` : "";
    md += `- ${scope}${entry.message} (\`${entry.hash}\`)\n`;
    visibleCount++;
  }
  md += "\n";
}

if (visibleCount === 0) {
  md += "_No notable changes in this release._\n\n";
}

// ---------------------------------------------------------------------------
// Generate JSON
// ---------------------------------------------------------------------------
const changelogJson = {
  version,
  date: releaseDate,
  from: fromRef || null,
  to: toRef,
  entries,
};

// ---------------------------------------------------------------------------
// Write outputs
// ---------------------------------------------------------------------------
const mdPath = path.join(outputDir, "CHANGELOG.md");
const jsonPath = path.join(outputDir, "changelog.json");

writeFileSync(mdPath, md, "utf8");
writeFileSync(jsonPath, JSON.stringify(changelogJson, null, 2), "utf8");

console.log(`Written: ${mdPath}`);
console.log(`Written: ${jsonPath}`);
console.log(
  `Entries: ${entries.length} total, ${visibleCount} user-facing`
);

// Also print the markdown to stdout for CI piping
console.log("\n--- CHANGELOG ---\n");
console.log(md);
