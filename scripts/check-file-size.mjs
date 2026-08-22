import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const checkedRoots = ["apps", "packages", "services", "scripts"];
const ignoredDirectories = new Set([
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
]);
const checkedExtensions = new Set([".js", ".mjs", ".ts", ".tsx"]);
const thresholds = {
  implementation: { hard: 400, recommended: 300 },
  reactComponent: { hard: 350, recommended: 250 },
  test: { hard: 500, recommended: 400 },
};

const root = process.cwd();
const files = [];

for (const checkedRoot of checkedRoots) {
  await collectFiles(join(root, checkedRoot));
}

const results = await Promise.all(files.map(readFileSize));
const hardFailures = results.filter((result) => result.lines > result.hard);
const warnings = results.filter(
  (result) => result.lines > result.recommended && result.lines <= result.hard,
);

printResults("File size warnings", warnings);
printResults("File size violations", hardFailures);

if (hardFailures.length > 0) {
  console.error(
    `\n${hardFailures.length} file(s) exceed the required split threshold from AGENTS.md.`,
  );
  process.exit(1);
}

console.log(
  `File size check passed: ${results.length} file(s) scanned, ${warnings.length} warning(s).`,
);

async function collectFiles(directory) {
  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") {
      return;
    }

    throw error;
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        await collectFiles(join(directory, entry.name));
      }
      continue;
    }

    if (entry.isFile() && checkedExtensions.has(readExtension(entry.name))) {
      files.push(join(directory, entry.name));
    }
  }
}

async function readFileSize(path) {
  const content = await readFile(path, "utf8");
  const category = readFileCategory(path);

  return {
    ...thresholds[category],
    category,
    lines: countLines(content),
    path: relative(root, path).split(sep).join("/"),
  };
}

function readFileCategory(path) {
  const normalized = relative(root, path).split(sep);
  const filename = normalized.at(-1) ?? "";

  if (
    /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(filename) ||
    normalized.includes("test")
  ) {
    return "test";
  }

  if (filename.endsWith(".tsx")) {
    return "reactComponent";
  }

  return "implementation";
}

function countLines(content) {
  if (content.length === 0) {
    return 0;
  }

  const lines = content.split(/\r\n|\r|\n/);

  return lines.at(-1) === "" ? lines.length - 1 : lines.length;
}

function readExtension(filename) {
  const match = filename.match(/(\.[^.]+)$/);

  return match?.[1] ?? "";
}

function printResults(title, results) {
  if (results.length === 0) {
    return;
  }

  console.warn(`\n${title}:`);

  for (const result of results) {
    console.warn(
      `  ${result.path}: ${result.lines} lines (${result.category}, recommended ${result.recommended}, hard ${result.hard})`,
    );
  }
}
