import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { readErrorMessage } from "../smoke/smoke-error-message.mjs";
import { defaultPageBuilderVisualReferenceSourceDir } from "./page-builder-visual-acceptance-constants.mjs";
import { decodePngImage } from "./png-image-reader.mjs";
import {
  createPageBuilderVisualReferenceImportArtifact,
  importPageBuilderVisualReferences,
} from "./page-builder-visual-reference-import.mjs";
import {
  createPageBuilderVisualReferenceHandoffOutputPaths,
  defaultPageBuilderVisualReferenceHandoffManifestPath,
  defaultPageBuilderVisualReferenceHandoffOutputDir,
  normalizePreviewScreenshotSourcePath,
  normalizeVisualReferenceHandoffOutputDir,
  pageBuilderVisualReferenceHandoffSchemaVersion,
} from "./page-builder-visual-reference-handoff-paths.mjs";
import {
  writePageBuilderVisualMissingReferencePaths,
  writePageBuilderVisualReferenceExportManifest,
  writePageBuilderVisualReferenceExportTable,
  writePageBuilderVisualReferenceRequestMarkdown,
} from "./page-builder-visual-reference-request.mjs";
import { normalizeVisualReferenceSourceDir } from "./page-builder-visual-reference-import-config.mjs";

export {
  createPageBuilderVisualReferenceHandoffCommand,
  createPageBuilderVisualReferenceHandoffOutputPaths,
  defaultPageBuilderVisualReferenceHandoffManifestPath,
  defaultPageBuilderVisualReferenceHandoffOutputDir,
  normalizePreviewScreenshotSourcePath,
  normalizeVisualReferenceHandoffOutputDir,
  pageBuilderVisualReferenceHandoffSchemaVersion,
} from "./page-builder-visual-reference-handoff-paths.mjs";

export function readPageBuilderVisualReferenceHandoffCliConfig(args = []) {
  const input = {
    manifestPath: defaultPageBuilderVisualReferenceHandoffManifestPath,
    outputDir: defaultPageBuilderVisualReferenceHandoffOutputDir,
    sourceDir: defaultPageBuilderVisualReferenceSourceDir,
  };
  const normalizedArgs = stripPnpmSeparator(args);

  for (let index = 0; index < normalizedArgs.length; index += 1) {
    const option = normalizedArgs[index];

    switch (option) {
      case "--manifest":
        input.manifestPath = readOptionValue(option, normalizedArgs, index);
        index += 1;
        break;
      case "--output-dir":
        input.outputDir = readOptionValue(option, normalizedArgs, index);
        index += 1;
        break;
      case "--source-dir":
        input.sourceDir = readOptionValue(option, normalizedArgs, index);
        index += 1;
        break;
      default:
        throw new Error(`Unknown visual reference handoff option: ${option}`);
    }
  }

  return {
    manifestPath: input.manifestPath,
    outputDir: normalizeVisualReferenceHandoffOutputDir(input.outputDir),
    sourceDir: normalizeVisualReferenceSourceDir(input.sourceDir),
  };
}

export async function createPageBuilderVisualReferenceHandoff(config) {
  const report = importPageBuilderVisualReferences({
    manifestPath: config.manifestPath,
    requireComplete: false,
    sourceDir: config.sourceDir,
    write: false,
  });
  const artifact = createPageBuilderVisualReferenceImportArtifact(report);

  return writePageBuilderVisualReferenceHandoff(config.outputDir, artifact);
}

export async function writePageBuilderVisualReferenceHandoff(
  outputDir,
  artifact,
  input = {},
) {
  const paths = createPageBuilderVisualReferenceHandoffOutputPaths(outputDir);
  const requestArtifact = {
    ...artifact,
    jsonOutputPath: paths.exportManifest,
    missingOutputPath: paths.missingPaths,
    tableOutputPath: paths.table,
  };

  await mkdir(outputDir, { recursive: true });
  await writePageBuilderVisualReferenceRequestMarkdown(
    paths.requestMarkdown,
    requestArtifact,
  );
  await writePageBuilderVisualMissingReferencePaths(paths.missingPaths, artifact);
  await writePageBuilderVisualReferenceExportTable(paths.table, artifact);
  await writePageBuilderVisualReferenceExportManifest(
    paths.exportManifest,
    artifact,
  );
  const previewScreenshots = await copyPreviewScreenshots({
    artifact,
    cwd: input.cwd ?? process.cwd(),
    outputDir,
    previewDir: paths.previewDir,
  });
  const handoffManifest = createPageBuilderVisualReferenceHandoffManifest({
    artifact,
    outputDir,
    paths,
    previewScreenshots,
  });

  await writeFile(
    paths.handoffManifest,
    `${JSON.stringify(handoffManifest, null, 2)}\n`,
    "utf8",
  );

  return {
    artifact,
    handoffManifest,
    paths,
  };
}

export function createPageBuilderVisualReferenceHandoffManifest(input) {
  const missingPreviewCount = input.previewScreenshots.filter(
    (preview) => preview.status !== "copied",
  ).length;

  return {
    complete: input.artifact.complete === true,
    generatedAt: input.artifact.generatedAt,
    handoffComplete: missingPreviewCount === 0,
    missingCount: input.artifact.missingCount,
    missingPreviewCount,
    outputDir: input.outputDir,
    previewCount: input.previewScreenshots.length,
    previewScreenshots: input.previewScreenshots,
    requiredReferenceCount: input.artifact.requiredReferenceCount,
    schemaVersion: pageBuilderVisualReferenceHandoffSchemaVersion,
    sourceDir: input.artifact.sourceDir,
    status: input.artifact.status,
    files: {
      exportManifest: input.paths.exportManifest,
      handoffManifest: input.paths.handoffManifest,
      missingPaths: input.paths.missingPaths,
      previewDir: input.paths.previewDir,
      requestMarkdown: input.paths.requestMarkdown,
      table: input.paths.table,
    },
  };
}

async function copyPreviewScreenshots(input) {
  const references = Array.isArray(input.artifact.requiredReferences)
    ? input.artifact.requiredReferences
    : [];

  await mkdir(input.previewDir, { recursive: true });

  return Promise.all(
    references.map((reference) => copyPreviewScreenshot(reference, input)),
  );
}

async function copyPreviewScreenshot(reference, input) {
  const targetFileName = `${reference.component}-${reference.viewport}.png`;
  const targetPath = `${input.previewDir}/${targetFileName}`;
  const targetAbsolutePath = path.resolve(input.cwd, targetPath);

  try {
    const sourcePath = normalizePreviewScreenshotSourcePath(
      reference.previewScreenshot?.path,
    );

    await copyFile(
      path.resolve(input.cwd, sourcePath),
      targetAbsolutePath,
    );
    const metadata = await readCopiedPreviewScreenshotMetadata(
      targetAbsolutePath,
      targetPath,
    );

    return {
      byteSize: metadata.byteSize,
      component: reference.component,
      handoffPath: targetPath,
      height: metadata.height,
      sha256: metadata.sha256,
      sourcePath,
      status: "copied",
      viewport: reference.viewport,
      width: metadata.width,
    };
  } catch (error) {
    return {
      component: reference.component,
      handoffPath: targetPath,
      reason: readErrorMessage(error),
      status: "missing",
      viewport: reference.viewport,
    };
  }
}

async function readCopiedPreviewScreenshotMetadata(filePath, label) {
  const buffer = await readFile(filePath);
  const image = decodePngImage(buffer, label);

  return {
    byteSize: buffer.length,
    height: image.height,
    sha256: createHash("sha256").update(buffer).digest("hex"),
    width: image.width,
  };
}

function readOptionValue(option, args, index) {
  const value = args[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value.`);
  }

  return value;
}

function stripPnpmSeparator(args) {
  return args[0] === "--" ? args.slice(1) : args;
}
