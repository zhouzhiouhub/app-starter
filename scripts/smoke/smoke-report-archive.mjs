import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { smokeReportSchemaVersion } from "./smoke-report-contract.mjs";
import { readSmokeReportMarkdownCompanion } from "./smoke-report-markdown-companion.mjs";
import { normalizeSmokeReportPath } from "./smoke-report-path-config.mjs";
import { createSmokeReportSummary } from "./smoke-report-summary.mjs";

export const defaultSmokeReportArchiveRoots = [
  ".tmp",
  "artifacts",
  "reports",
  "tmp",
];

const maxArchiveDiscoveryDepth = 8;

export async function readSmokeReportArtifact(reportPath, options = {}) {
  const normalizedPath = normalizeSmokeReportPath(reportPath);
  const absolutePath = join(options.baseDir ?? process.cwd(), normalizedPath);
  const [content, stats] = await Promise.all([
    readFile(absolutePath, "utf8"),
    stat(absolutePath),
  ]);
  const report = parseSmokeReportArtifact(content, normalizedPath);

  const archiveEntry = createSmokeReportArchiveEntry({
    mtimeMs: stats.mtimeMs,
    path: normalizedPath,
    report,
  });

  return {
    ...archiveEntry,
    markdown: await readSmokeReportMarkdownCompanion(normalizedPath, report, {
      baseDir: options.baseDir,
    }),
  };
}

export async function discoverSmokeReportArtifacts(options = {}) {
  const baseDir = options.baseDir ?? process.cwd();
  const roots = readSmokeReportArchiveRoots(options.roots);
  const candidates = [];

  for (const root of roots) {
    candidates.push(...(await discoverSmokeReportPaths(baseDir, root)));
  }

  const artifacts = [];
  for (const candidate of candidates) {
    const artifact = await readOptionalSmokeReportArtifact(candidate, baseDir);

    if (artifact) {
      artifacts.push(artifact);
    }
  }

  artifacts.sort(compareSmokeReportArtifacts);

  return Number.isInteger(options.limit) && options.limit > 0
    ? artifacts.slice(0, options.limit)
    : artifacts;
}

export function createSmokeReportArchiveEntry(input) {
  const entry = {
    finishedAt: readIsoTimestamp(input.report?.finishedAt),
    mtimeMs: Number.isFinite(input.mtimeMs) ? input.mtimeMs : 0,
    path: input.path,
    report: input.report,
    startedAt: readIsoTimestamp(input.report?.startedAt),
    summary: createSmokeReportSummary(input.report),
  };

  if (input.markdown) {
    entry.markdown = input.markdown;
  }

  return entry;
}

export function parseSmokeReportArtifact(content, reportPath = "smoke report") {
  const report = parseJson(content, reportPath);

  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error(`${reportPath} is not an object-shaped smoke report.`);
  }

  if (report.schemaVersion !== smokeReportSchemaVersion) {
    throw new Error(
      `${reportPath} is not a ${smokeReportSchemaVersion} smoke report.`,
    );
  }

  return report;
}

export function normalizeSmokeReportArchiveRoot(root) {
  if (typeof root !== "string") {
    throw new Error("Smoke report archive root must be a relative path.");
  }

  const normalized = root.trim().replace(/\\/g, "/").replace(/\/+$/u, "");

  normalizeSmokeReportPath(`${normalized}/smoke-report.json`);

  return normalized;
}

async function discoverSmokeReportPaths(baseDir, root) {
  const paths = [];

  await walkSmokeReportArchive(baseDir, root, 0, paths);

  return paths;
}

async function walkSmokeReportArchive(baseDir, relativeDir, depth, paths) {
  if (depth > maxArchiveDiscoveryDepth) {
    return;
  }

  const absoluteDir = join(baseDir, relativeDir);
  let entries;

  try {
    entries = await readdir(absoluteDir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") {
      return;
    }

    throw error;
  }

  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const relativePath = `${relativeDir}/${entry.name}`.replace(/\\/g, "/");

    if (entry.isDirectory()) {
      await walkSmokeReportArchive(baseDir, relativePath, depth + 1, paths);
      continue;
    }

    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".json")) {
      continue;
    }

    const safePath = readSafeCandidatePath(relativePath);

    if (safePath) {
      paths.push(safePath);
    }
  }
}

async function readOptionalSmokeReportArtifact(reportPath, baseDir) {
  try {
    return await readSmokeReportArtifact(reportPath, { baseDir });
  } catch {
    return null;
  }
}

function readSafeCandidatePath(path) {
  try {
    return normalizeSmokeReportPath(path);
  } catch {
    return null;
  }
}

function readSmokeReportArchiveRoots(roots) {
  const values =
    Array.isArray(roots) && roots.length > 0
      ? roots
      : defaultSmokeReportArchiveRoots;

  return values.map((root) => normalizeSmokeReportArchiveRoot(root));
}

function compareSmokeReportArtifacts(left, right) {
  return (
    readSmokeReportSortTime(right) - readSmokeReportSortTime(left) ||
    left.path.localeCompare(right.path)
  );
}

function readSmokeReportSortTime(artifact) {
  return (
    Date.parse(artifact.finishedAt ?? "") ||
    Date.parse(artifact.startedAt ?? "") ||
    artifact.mtimeMs ||
    0
  );
}

function parseJson(content, reportPath) {
  try {
    return JSON.parse(content);
  } catch {
    throw new Error(`${reportPath} is not valid JSON.`);
  }
}

function readIsoTimestamp(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value))
    ? value
    : null;
}
