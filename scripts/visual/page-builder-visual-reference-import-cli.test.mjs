import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { runPageBuilderVisualReferenceImportCli } from "../page-builder-visual-import-references.mjs";
import {
  mvpPageBuilderComponents,
  pageBuilderVisualAcceptanceViewports,
} from "./page-builder-visual-acceptance.mjs";
import { createTestPng } from "./page-builder-visual-artifact-check-test-fixtures.mjs";

test("visual reference import CLI writes Markdown output", async () => {
  const sourceDir = `reports/visual/reference-import-${process.pid}-${Date.now()}`;
  const outputPath = `${sourceDir}/visual-reference-import-report.md`;
  const stdout = [];
  const originalConsoleLog = console.log;

  console.log = (line) => stdout.push(line);

  try {
    writeReferenceFilesToDir(sourceDir);

    const exitCode = await runPageBuilderVisualReferenceImportCli([
      "--source-dir",
      sourceDir,
      "--markdown-output",
      outputPath,
    ]);
    const markdown = readFileSync(outputPath, "utf8");

    assert.equal(exitCode, 0);
    assert.match(markdown, /^# Page Builder Visual Reference Import/m);
    assert.match(markdown, /Status: `would-update`/);
    assert.match(markdown, /hero-banner\.desktop/);
    assert.match(
      stdout.join("\n"),
      new RegExp(
        `Visual reference import Markdown written: ${escapeRegExp(outputPath)}`,
      ),
    );
  } finally {
    console.log = originalConsoleLog;
    rmSync(sourceDir, { force: true, recursive: true });
  }
});

test("visual reference import CLI writes JSON output", async () => {
  const sourceDir = `reports/visual/reference-import-json-${process.pid}-${Date.now()}`;
  const outputPath = `${sourceDir}/visual-reference-import-report.json`;
  const stdout = [];
  const originalConsoleLog = console.log;

  console.log = (line) => stdout.push(line);

  try {
    writeReferenceFilesToDir(sourceDir, { skip: "faq-mobile.png" });

    const exitCode = await runPageBuilderVisualReferenceImportCli([
      "--source-dir",
      sourceDir,
      "--output",
      outputPath,
      "--json",
      "--require-complete",
    ]);
    const artifact = JSON.parse(readFileSync(outputPath, "utf8"));
    const stdoutArtifact = JSON.parse(stdout[0]);

    assert.equal(exitCode, 1);
    assert.equal(
      artifact.schemaVersion,
      "page-builder-visual-reference-import.v1",
    );
    assert.equal(artifact.status, "invalid");
    assert.equal(artifact.sourceDirStatus, "ready");
    assert.equal(artifact.missingCount, 1);
    assert.equal(
      artifact.missing[0].expectedPath,
      `${sourceDir}/faq-mobile.png`,
    );
    assert.equal(stdoutArtifact.missingCount, artifact.missingCount);
  } finally {
    console.log = originalConsoleLog;
    rmSync(sourceDir, { force: true, recursive: true });
  }
});

function writeReferenceFilesToDir(sourceDir, options = {}) {
  mkdirSync(sourceDir, { recursive: true });

  for (const component of mvpPageBuilderComponents) {
    for (const viewport of pageBuilderVisualAcceptanceViewports) {
      const fileName = `${component}-${viewport}.png`;

      if (fileName !== options.skip) {
        writeFileSync(path.join(sourceDir, fileName), createTestPng(2, 1));
      }
    }
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
