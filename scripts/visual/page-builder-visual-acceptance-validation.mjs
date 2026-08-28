import {
  defaultPageBuilderVisualAcceptanceTargets,
  pageBuilderVisualAcceptanceSchemaVersion,
} from "./page-builder-visual-acceptance-constants.mjs";
import { createPageBuilderVisualAcceptanceReport } from "./page-builder-visual-acceptance-report.mjs";
import {
  createVisualAcceptanceIssue,
  isObject,
  readPageBuilderVisualAcceptanceTargets,
} from "./page-builder-visual-acceptance-targets.mjs";
import { summarizePageBuilderVisualAcceptanceRecords } from "./page-builder-visual-acceptance-records.mjs";

export function validatePageBuilderVisualAcceptanceManifest(
  manifest,
  options = {},
) {
  const issues = [];

  if (!isObject(manifest)) {
    return createPageBuilderVisualAcceptanceReport({
      acceptedComponentCount: 0,
      acceptedViewportCount: 0,
      issues: [
        createVisualAcceptanceIssue(
          "error",
          "invalid_manifest",
          "Manifest must be an object.",
        ),
      ],
      records: [],
      targets: defaultPageBuilderVisualAcceptanceTargets,
    });
  }

  validateSchemaVersion(manifest, issues);
  const targets = readPageBuilderVisualAcceptanceTargets(manifest, issues);
  const records = summarizePageBuilderVisualAcceptanceRecords(manifest, {
    evidenceRoot: options.evidenceRoot ?? process.cwd(),
    issues,
    requireAccepted: Boolean(options.requireAccepted),
    targets,
  });

  return createPageBuilderVisualAcceptanceReport({
    acceptedComponentCount: records.filter((record) => record.accepted).length,
    acceptedViewportCount: records.reduce(
      (count, record) => count + record.acceptedViewportCount,
      0,
    ),
    issues,
    records,
    targets,
  });
}

function validateSchemaVersion(manifest, issues) {
  if (manifest.schemaVersion === pageBuilderVisualAcceptanceSchemaVersion) {
    return;
  }

  issues.push(
    createVisualAcceptanceIssue(
      "error",
      "invalid_schema_version",
      `Manifest schemaVersion must be ${pageBuilderVisualAcceptanceSchemaVersion}.`,
    ),
  );
}
