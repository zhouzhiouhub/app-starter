import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { readPngImage } from "./png-image-reader.mjs";
import {
  pageBuilderVisualAcceptanceSchemaVersion,
  pageBuilderVisualAcceptanceViewports,
} from "./page-builder-visual-acceptance-constants.mjs";
import { readPageBuilderVisualAcceptanceTargets } from "./page-builder-visual-acceptance-targets.mjs";
import { validateVisualAcceptanceEvidencePath } from "./page-builder-visual-acceptance-evidence-paths.mjs";
import {
  compareVisualImages,
  passesVisualMetricThresholds,
} from "./page-builder-visual-measure-metrics.mjs";

export function readPageBuilderVisualMeasureManifest(manifestPath) {
  return JSON.parse(readFileSync(manifestPath, "utf8"));
}

export function writePageBuilderVisualMeasureManifest(manifestPath, manifest) {
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

export function measurePageBuilderVisualAcceptanceManifest(
  manifest,
  config,
  input = {},
) {
  const issues = [];
  const context = {
    evidenceRoot: input.evidenceRoot ?? process.cwd(),
    issues,
    targets: readPageBuilderVisualAcceptanceTargets(manifest, issues),
  };
  const measurements = [];
  let missingViewportCount = 0;

  validateMeasureManifestShape(manifest, context.issues);

  for (const record of Array.isArray(manifest.records) ? manifest.records : []) {
    if (!config.components.includes(record.component)) {
      continue;
    }

    missingViewportCount += measureRecord(record, config, context, measurements);
  }

  if (config.requireComplete && missingViewportCount > 0) {
    context.issues.push({
      code: "visual_measure_incomplete",
      message: `${missingViewportCount} selected viewport(s) are missing design references or screenshots.`,
      severity: "error",
    });
  }

  if (config.write) {
    applyMeasurementsToManifest(manifest, measurements, config);
  }

  return {
    failedViewportCount: measurements.filter((item) => !item.passing).length,
    issues: context.issues,
    measuredViewportCount: measurements.length,
    measurements,
    missingViewportCount,
    status: readMeasureStatus(context.issues, measurements, missingViewportCount),
    targetViewportCount: config.components.length * config.viewports.length,
  };
}

function measureRecord(record, config, context, measurements) {
  let missingViewportCount = 0;

  for (const viewport of config.viewports) {
    const evidence = record.viewports?.[viewport];

    if (!hasEvidencePair(evidence)) {
      missingViewportCount += 1;
      continue;
    }

    const measurement = measureViewportEvidence(
      record.component,
      viewport,
      evidence,
      context,
    );

    if (measurement) {
      measurements.push(measurement);
    }
  }

  return missingViewportCount;
}

function measureViewportEvidence(component, viewport, evidence, context) {
  if (!validateEvidencePair(component, viewport, evidence, context)) {
    return null;
  }

  let metrics;

  try {
    const reference = readPngImage(
      resolveEvidencePath(context, evidence.designReference),
    );
    const preview = readPngImage(
      resolveEvidencePath(context, evidence.previewScreenshot),
    );
    metrics = compareVisualImages(reference, preview);
  } catch (error) {
    context.issues.push({
      code: "visual_measure_failed",
      component,
      message: `${component}.${viewport} could not be measured: ${readErrorMessage(
        error,
      )}`,
      severity: "error",
      viewport,
    });
    return null;
  }

  return {
    component,
    passing: passesVisualMetricThresholds(metrics, context.targets),
    ...metrics,
    viewport,
  };
}

function readErrorMessage(error) {
  return error instanceof Error ? error.message : "Unknown image error.";
}

function validateEvidencePair(component, viewport, evidence, context) {
  return ["designReference", "previewScreenshot"]
    .map((field) =>
      validateVisualAcceptanceEvidencePath(
        {
          component,
          field,
          value: evidence[field],
          viewport,
        },
        context,
      ),
    )
    .every(Boolean);
}

function applyMeasurementsToManifest(manifest, measurements, config) {
  for (const measurement of measurements) {
    const record = manifest.records.find(
      (item) => item.component === measurement.component,
    );
    const viewportEvidence = record?.viewports?.[measurement.viewport];

    if (!viewportEvidence) {
      continue;
    }

    viewportEvidence.maxColorDeltaE = measurement.maxColorDeltaE;
    viewportEvidence.maxLayoutDeltaPx = measurement.maxLayoutDeltaPx;
    viewportEvidence.visualMatchPercent = measurement.visualMatchPercent;

    if (config.acceptPassing && measurement.passing) {
      viewportEvidence.status = "accepted";
    }
  }

  if (config.acceptPassing) {
    updateRecordStatuses(manifest);
  }
}

function updateRecordStatuses(manifest) {
  for (const record of manifest.records) {
    const statuses = pageBuilderVisualAcceptanceViewports.map(
      (viewport) => record.viewports?.[viewport]?.status,
    );

    if (statuses.length > 0 && statuses.every((status) => status === "accepted")) {
      record.status = "accepted";
    }
  }
}

function hasEvidencePair(evidence) {
  return Boolean(evidence?.designReference && evidence?.previewScreenshot);
}

function resolveEvidencePath(context, evidencePath) {
  return path.resolve(context.evidenceRoot, evidencePath);
}

function validateMeasureManifestShape(manifest, issues) {
  if (manifest.schemaVersion !== pageBuilderVisualAcceptanceSchemaVersion) {
    issues.push({
      code: "invalid_schema_version",
      message: `Manifest schemaVersion must be ${pageBuilderVisualAcceptanceSchemaVersion}.`,
      severity: "error",
    });
  }

  if (!Array.isArray(manifest.records)) {
    issues.push({
      code: "invalid_records",
      message: "records must be an array.",
      severity: "error",
    });
  }
}

function readMeasureStatus(issues, measurements, missingViewportCount) {
  if (issues.some((issue) => issue.severity === "error")) {
    return "invalid";
  }

  if (measurements.length === 0 || missingViewportCount > 0) {
    return "needs-evidence";
  }

  return measurements.every((measurement) => measurement.passing)
    ? "measured"
    : "failed";
}
