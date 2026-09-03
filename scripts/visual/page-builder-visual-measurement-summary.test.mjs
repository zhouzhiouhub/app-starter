import assert from "node:assert/strict";
import test from "node:test";
import {
  createPageBuilderVisualMeasurementSummary,
  formatPageBuilderVisualMeasurementSummary,
} from "./page-builder-visual-measurement-summary.mjs";

test("page builder visual measurement summary counts measured failures", () => {
  const summary = createPageBuilderVisualMeasurementSummary({
    components: [
      {
        viewports: [
          {
            component: "hero-banner",
            missing: [
              "visualMatchPercent >= 95 (current 0.15)",
              "maxColorDeltaE <= 3 (current 149.09)",
              "status=accepted",
            ],
            ready: false,
            viewport: "desktop",
          },
          {
            component: "hero-banner",
            missing: ["status=accepted"],
            ready: false,
            viewport: "mobile",
          },
          {
            component: "rich-text",
            missing: [],
            ready: true,
            viewport: "desktop",
          },
        ],
      },
    ],
  });

  assert.deepEqual(summary, {
    failedMeasurementCount: 2,
    failedMeasurementViewportCount: 1,
    firstFailedMeasurement:
      "hero-banner.desktop: visualMatchPercent >= 95 (current 0.15); maxColorDeltaE <= 3 (current 149.09)",
  });
  assert.equal(
    formatPageBuilderVisualMeasurementSummary(summary),
    "1 measured viewports failing, 2 failed metrics, first failed hero-banner.desktop: visualMatchPercent >= 95 (current 0.15); maxColorDeltaE <= 3 (current 149.09)",
  );
});

test("page builder visual measurement summary ignores unmeasured pending tasks", () => {
  const summary = createPageBuilderVisualMeasurementSummary({
    components: [
      {
        viewports: [
          {
            component: "hero-banner",
            missing: [
              "designReference",
              "visualMatchPercent >= 95",
              "maxColorDeltaE <= 3",
            ],
            ready: false,
            viewport: "desktop",
          },
        ],
      },
    ],
  });

  assert.deepEqual(summary, {
    failedMeasurementCount: 0,
    failedMeasurementViewportCount: 0,
    firstFailedMeasurement: null,
  });
  assert.equal(formatPageBuilderVisualMeasurementSummary(summary), null);
});
