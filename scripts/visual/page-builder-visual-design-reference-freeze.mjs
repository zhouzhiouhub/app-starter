import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import {
  pageBuilderVisualCaptureDefaultHeight,
  pageBuilderVisualCaptureViewportWidths,
} from "./page-builder-visual-capture-constants.mjs";
import { readPageBuilderVisualReferencePlaceholderIssue } from "./page-builder-visual-reference-placeholder.mjs";
import { readPngImage } from "./png-image-reader.mjs";

export function createPageBuilderVisualDesignReferenceFileName(
  component,
  viewport,
) {
  return `${component}-${viewport}.png`;
}

export function createPageBuilderVisualFixtureScreenshotFileName(
  component,
  viewport,
) {
  return `page-builder-visual-fixture-${component}-${viewport}.png`;
}

export function freezePageBuilderVisualDesignReferences(config, input = {}) {
  const cwd = input.cwd ?? process.cwd();
  const sourceDir = path.resolve(cwd, config.sourceDir);
  const outputDir = path.resolve(cwd, config.outputDir);
  const exports = [];

  mkdirSync(outputDir, { recursive: true });

  for (const component of config.components) {
    for (const viewport of config.viewports) {
      exports.push(
        freezeViewportReference({
          component,
          config,
          cwd,
          expectedHeight:
            input.height ?? pageBuilderVisualCaptureDefaultHeight,
          expectedWidth:
            input.viewportWidths?.[viewport] ??
            pageBuilderVisualCaptureViewportWidths[viewport],
          outputDir,
          readPng: input.readPng ?? readPngImage,
          sourceDir,
          viewport,
        }),
      );
    }
  }

  return {
    exports,
    outputDir: config.outputDir,
    sourceDir: config.sourceDir,
    status: "updated",
  };
}

export function formatPageBuilderVisualDesignReferenceFreezeReport(result) {
  const lines = [
    "Page Builder visual design reference freeze",
    `Status: ${result.status}`,
    `Source: ${result.sourceDir}`,
    `Output: ${result.outputDir}`,
    `Exported: ${result.exports.length}`,
  ];

  for (const item of result.exports) {
    lines.push(`  - ${item.component}.${item.viewport}: ${item.outputPath}`);
  }

  return lines;
}

function freezeViewportReference(input) {
  const sourceName = createPageBuilderVisualFixtureScreenshotFileName(
    input.component,
    input.viewport,
  );
  const outputName = createPageBuilderVisualDesignReferenceFileName(
    input.component,
    input.viewport,
  );
  const sourcePath = path.join(input.sourceDir, sourceName);
  const outputPath = path.join(input.outputDir, outputName);
  const image = readSourceImage(sourcePath, sourceName, input.readPng);

  assertExpectedDimensions(image, input, sourceName);
  assertApprovedDesignSource(image, sourceName);
  copyFileSync(sourcePath, outputPath);

  return {
    component: input.component,
    outputPath: toPosixPath(path.relative(input.cwd, outputPath)),
    sourcePath: toPosixPath(path.relative(input.cwd, sourcePath)),
    viewport: input.viewport,
  };
}

function readSourceImage(sourcePath, sourceName, readPng) {
  try {
    return readPng(sourcePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${sourceName} must be a readable fixture screenshot: ${message}`,
    );
  }
}

function assertExpectedDimensions(image, input, sourceName) {
  if (
    image.width === input.expectedWidth &&
    image.height === input.expectedHeight
  ) {
    return;
  }

  throw new Error(
    `${sourceName} must be ${input.expectedWidth}x${input.expectedHeight}, received ${image.width}x${image.height}.`,
  );
}

function assertApprovedDesignSource(image, sourceName) {
  const placeholderIssue = readPageBuilderVisualReferencePlaceholderIssue(image);

  if (placeholderIssue) {
    throw new Error(`${sourceName} ${placeholderIssue}`);
  }
}

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}
