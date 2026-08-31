import assert from "node:assert/strict";
import test from "node:test";
import {
  createProjectStatusArtifact,
  formatProjectStatusArtifact,
} from "./project-status.mjs";
import { createBlockedCheck } from "./project-status-test-fixtures.mjs";

test("project status formatter can preserve full action lines", () => {
  const artifact = createProjectStatusArtifact(createBlockedCheck(), {
    generatedAt: "2026-08-28T00:00:00.000Z",
    includeAllActions: true,
  });
  const endMarker = "final-full-action-marker";
  const longAction = [
    "Run",
    "pnpm visual:measure -- --write --require-complete ".repeat(12),
    endMarker,
  ].join(" ");

  artifact.nextActions = [
    {
      action: longAction,
      area: "Page Builder Visual",
      label: "spec-table.mobile",
    },
  ];
  artifact.nextActionCount = 1;
  artifact.nextActionLimit = 1;
  artifact.truncatedNextActionCount = 0;

  const truncatedText = formatProjectStatusArtifact(artifact).join("\n");
  const fullText = formatProjectStatusArtifact(artifact, {
    truncateLines: false,
  }).join("\n");

  assert.equal(truncatedText.includes(endMarker), false);
  assert.equal(fullText.includes(endMarker), true);
});
