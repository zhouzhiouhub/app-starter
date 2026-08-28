import assert from "node:assert/strict";
import test from "node:test";
import {
  createPageBuilderVisualAcceptanceChecklist,
  formatPageBuilderVisualAcceptanceChecklist,
  mvpPageBuilderComponents,
  pageBuilderVisualAcceptanceSchemaVersion,
  readPageBuilderVisualAcceptanceManifest,
} from "./page-builder-visual-acceptance.mjs";

test("visual acceptance checklist lists missing release evidence", async () => {
  const manifest = await readPageBuilderVisualAcceptanceManifest();
  const checklist = createPageBuilderVisualAcceptanceChecklist(manifest);
  const lines = formatPageBuilderVisualAcceptanceChecklist(checklist);

  assert.equal(checklist.viewportCount, 12);
  assert.equal(checklist.readyViewportCount, 0);
  assert.equal(checklist.pendingViewportCount, 12);
  assert.match(lines.join("\n"), /Evidence checklist:/);
  assert.match(
    lines.join("\n"),
    /hero-banner\.desktop: missing designReference, visualMatchPercent >= 95, maxLayoutDeltaPx <= 5, maxColorDeltaE <= 3, status=accepted/,
  );
  assert.match(lines.join("\n"), /Next: attach missing design references/);
});

test("visual acceptance checklist marks passing evidence ready", () => {
  const checklist = createPageBuilderVisualAcceptanceChecklist(
    createAcceptedManifest(),
  );
  const lines = formatPageBuilderVisualAcceptanceChecklist(checklist);

  assert.equal(checklist.readyViewportCount, 12);
  assert.equal(checklist.pendingViewportCount, 0);
  assert.match(lines.join("\n"), /hero-banner\.desktop: ready/);
  assert.doesNotMatch(lines.join("\n"), /Next: attach missing/);
});

test("visual acceptance checklist calls out failing metrics", () => {
  const manifest = createAcceptedManifest();
  manifest.records[0].viewports.desktop.visualMatchPercent = 94;
  manifest.records[0].viewports.desktop.maxLayoutDeltaPx = 8;
  manifest.records[0].viewports.desktop.maxColorDeltaE = 3.5;

  const checklist = createPageBuilderVisualAcceptanceChecklist(manifest);
  const lines = formatPageBuilderVisualAcceptanceChecklist(checklist);

  assert.equal(checklist.readyViewportCount, 11);
  assert.match(lines.join("\n"), /visualMatchPercent >= 95 \(current 94\)/);
  assert.match(lines.join("\n"), /maxLayoutDeltaPx <= 5 \(current 8\)/);
  assert.match(lines.join("\n"), /maxColorDeltaE <= 3 \(current 3.5\)/);
});

function createAcceptedManifest() {
  return {
    records: mvpPageBuilderComponents.map((component) => ({
      component,
      label: component,
      status: "accepted",
      viewports: {
        desktop: createAcceptedViewportEvidence(component, "desktop"),
        mobile: createAcceptedViewportEvidence(component, "mobile"),
      },
    })),
    schemaVersion: pageBuilderVisualAcceptanceSchemaVersion,
    targets: {
      components: mvpPageBuilderComponents,
      maxColorDeltaE: 3,
      maxLayoutDeltaPx: 5,
      minVisualMatchPercent: 95,
      viewports: ["desktop", "mobile"],
    },
  };
}

function createAcceptedViewportEvidence(component, viewport) {
  return {
    designReference: `docs/design/${component}-${viewport}.png`,
    maxColorDeltaE: 2.5,
    maxLayoutDeltaPx: 4,
    previewScreenshot: `artifacts/visual/${component}-${viewport}.png`,
    status: "accepted",
    visualMatchPercent: 96,
  };
}
