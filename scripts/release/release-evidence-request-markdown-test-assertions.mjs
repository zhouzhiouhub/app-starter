import assert from "node:assert/strict";
import {
  createReleaseEvidenceRequest,
  createReleaseEvidenceRequestMarkdown,
  readReleaseEvidenceRequestCliConfig,
} from "./release-evidence-request.mjs";
import { assertProductionSmokeRequest } from "./release-evidence-request-smoke-markdown-test-assertions.mjs";

export async function assertReleaseEvidenceRequestMarkdownHandoff({
  root,
  visualManifest,
}) {
  const paths = createReleaseEvidenceRequestOutputPaths(root);
  const request = await createReleaseEvidenceRequest(
    readReleaseEvidenceRequestCliConfig([
      "--output",
      paths.releaseOutputPath,
      "--requests-manifest-output",
      paths.requestsManifestOutputPath,
      "--visual-output",
      paths.visualOutputPath,
      "--visual-missing-output",
      paths.visualMissingOutputPath,
      "--visual-table-output",
      paths.visualTableOutputPath,
      "--visual-json-output",
      paths.visualJsonOutputPath,
      "--visual-handoff-output",
      paths.visualHandoffOutputPath,
      "--smoke-output",
      paths.smokeOutputPath,
      "--smoke-inputs-output",
      paths.smokeInputsOutputPath,
      "--smoke-inputs-table-output",
      paths.smokeInputsTableOutputPath,
      "--smoke-inputs-json-output",
      paths.smokeInputsJsonOutputPath,
    ]),
    {
      smokeArtifact: { error: new Error("No smoke reports found.") },
      visualManifest,
      visualReferenceManifest: visualManifest,
      visualReferenceRoot: root,
    },
    "2026-09-01T00:00:00.000Z",
  );
  const markdown = createReleaseEvidenceRequestMarkdown(request);

  assert.equal(request.projectArtifact.releaseReady, false);
  assert.equal(request.visualReferenceArtifact.missingCount, 12);
  assert.match(markdown, /^# MVP Release Evidence Request/m);
  assert.match(markdown, /Release ready: `no`/);
  assertReleaseEvidenceRequestCommand(markdown, paths);
  assertReleaseEvidenceRequestOutputs(markdown, paths);
  assertVisualReferenceRequest(markdown, paths);
  assertProductionSmokeRequest(markdown, paths);
  assert.match(
    markdown,
    /First missing visual reference: `docs\/visual\/page-builder-references\/hero-banner-desktop\.png`/,
  );
  assert.match(markdown, /## Page Builder Design Reference Request/);
  assert.match(
    markdown,
    /docs\/visual\/page-builder-references\/hero-banner-desktop\.png/,
  );
  assert.match(markdown, /## Production Smoke Evidence Request/);
  assert.match(
    markdown,
    /`visual_artifact_name`: `page-builder-visual-fixture-<run_number>`/,
  );
  assert.match(
    markdown,
    /Do not mark the project complete from this request alone/,
  );
}

function createReleaseEvidenceRequestOutputPaths(root) {
  return {
    releaseOutputPath: `${root}/release.md`,
    requestsManifestOutputPath: `${root}/release-requests-manifest.json`,
    visualOutputPath: `${root}/visual.md`,
    visualMissingOutputPath: `${root}/missing.txt`,
    visualTableOutputPath: `${root}/reference-table.tsv`,
    visualJsonOutputPath: `${root}/reference-manifest.json`,
    visualHandoffOutputPath: `${root}/visual-handoff`,
    smokeOutputPath: `${root}/smoke.md`,
    smokeInputsOutputPath: `${root}/smoke-inputs.txt`,
    smokeInputsTableOutputPath: `${root}/smoke-inputs.tsv`,
    smokeInputsJsonOutputPath: `${root}/smoke-inputs.json`,
  };
}

function assertReleaseEvidenceRequestCommand(markdown, paths) {
  assert.match(
    markdown,
    new RegExp(
      `Refresh all requests: \`pnpm release:requests -- --release-output ${escapeRegExp(
        paths.releaseOutputPath,
      )} --requests-manifest-output ${escapeRegExp(
        paths.requestsManifestOutputPath,
      )} --visual-output ${escapeRegExp(
        paths.visualOutputPath,
      )} --visual-missing-output ${escapeRegExp(
        paths.visualMissingOutputPath,
      )} --visual-table-output ${escapeRegExp(
        paths.visualTableOutputPath,
      )} --visual-json-output ${escapeRegExp(
        paths.visualJsonOutputPath,
      )} --visual-handoff-output ${escapeRegExp(
        paths.visualHandoffOutputPath,
      )} --smoke-output ${escapeRegExp(
        paths.smokeOutputPath,
      )} --smoke-inputs-output ${escapeRegExp(
        paths.smokeInputsOutputPath,
      )} --smoke-inputs-table-output ${escapeRegExp(
        paths.smokeInputsTableOutputPath,
      )} --smoke-inputs-json-output ${escapeRegExp(
        paths.smokeInputsJsonOutputPath,
      )}\``,
    ),
  );
  assert.match(
    markdown,
    new RegExp(
      `Release evidence request: \`pnpm release:evidence-request -- --output ${escapeRegExp(
        paths.releaseOutputPath,
      )} --requests-manifest-output ${escapeRegExp(
        paths.requestsManifestOutputPath,
      )} --visual-output ${escapeRegExp(
        paths.visualOutputPath,
      )} --visual-missing-output ${escapeRegExp(
        paths.visualMissingOutputPath,
      )} --visual-table-output ${escapeRegExp(
        paths.visualTableOutputPath,
      )} --visual-json-output ${escapeRegExp(
        paths.visualJsonOutputPath,
      )} --visual-handoff-output ${escapeRegExp(
        paths.visualHandoffOutputPath,
      )} --smoke-output ${escapeRegExp(
        paths.smokeOutputPath,
      )} --smoke-inputs-output ${escapeRegExp(
        paths.smokeInputsOutputPath,
      )} --smoke-inputs-table-output ${escapeRegExp(
        paths.smokeInputsTableOutputPath,
      )} --smoke-inputs-json-output ${escapeRegExp(
        paths.smokeInputsJsonOutputPath,
      )}\``,
    ),
  );
}

function assertReleaseEvidenceRequestOutputs(markdown, paths) {
  assert.match(
    markdown,
    new RegExp(
      `Request outputs: \`${escapeRegExp(
        [
          paths.releaseOutputPath,
          paths.requestsManifestOutputPath,
          paths.visualOutputPath,
          paths.visualMissingOutputPath,
          paths.visualTableOutputPath,
          paths.visualJsonOutputPath,
          paths.visualHandoffOutputPath,
          paths.smokeOutputPath,
          paths.smokeInputsOutputPath,
          paths.smokeInputsTableOutputPath,
          paths.smokeInputsJsonOutputPath,
        ].join(", "),
      )}\``,
    ),
  );
  assert.match(
    markdown,
    new RegExp(
      `Release requests manifest: \`${escapeRegExp(
        paths.requestsManifestOutputPath,
      )}\``,
    ),
  );
}

function assertVisualReferenceRequest(markdown, paths) {
  assert.match(
    markdown,
    new RegExp(
      `Page Builder design request: \`pnpm visual:references:request -- --output ${escapeRegExp(
        paths.visualOutputPath,
      )} --missing-output ${escapeRegExp(
        paths.visualMissingOutputPath,
      )} --table-output ${escapeRegExp(
        paths.visualTableOutputPath,
      )} --json-output ${escapeRegExp(paths.visualJsonOutputPath)}\``,
    ),
  );
  assert.match(
    markdown,
    new RegExp(
      `Page Builder reference export manifest: \`${escapeRegExp(
        paths.visualJsonOutputPath,
      )}\``,
    ),
  );
  assert.match(
    markdown,
    new RegExp(
      `Page Builder design handoff package: \`pnpm visual:references:handoff -- --output-dir ${escapeRegExp(
        paths.visualHandoffOutputPath,
      )}\``,
    ),
  );
  assert.match(
    markdown,
    new RegExp(
      `Page Builder design handoff output: \`${escapeRegExp(
        paths.visualHandoffOutputPath,
      )}\``,
    ),
  );
  assert.match(
    markdown,
    new RegExp(
      `Missing path output: \`${escapeRegExp(
        paths.visualMissingOutputPath,
      )}\``,
    ),
  );
  assert.match(
    markdown,
    new RegExp(
      `Export table output: \`${escapeRegExp(paths.visualTableOutputPath)}\``,
    ),
  );
  assert.match(
    markdown,
    new RegExp(
      `Export manifest output: \`${escapeRegExp(paths.visualJsonOutputPath)}\``,
    ),
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
