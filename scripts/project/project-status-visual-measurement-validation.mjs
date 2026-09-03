import {
  assertCountNotGreater,
  assertNullableString,
  assertOptionalNonNegativeNumber,
} from "./project-status-validation-primitives.mjs";

export function assertOptionalVisualMeasurementFailures(visual) {
  if (
    visual.failedMeasurementCount === undefined &&
    visual.failedMeasurementViewportCount === undefined &&
    visual.firstFailedMeasurement === undefined
  ) {
    return;
  }

  assertOptionalNonNegativeNumber(
    visual.failedMeasurementCount,
    "releaseGate.visual.failedMeasurementCount",
  );
  assertOptionalNonNegativeNumber(
    visual.failedMeasurementViewportCount,
    "releaseGate.visual.failedMeasurementViewportCount",
  );
  assertCountNotGreater(
    visual.failedMeasurementViewportCount,
    visual.viewportCount,
    "releaseGate.visual.failedMeasurementViewportCount",
    "viewportCount",
  );
  assertNullableString(
    visual.firstFailedMeasurement,
    "releaseGate.visual.firstFailedMeasurement",
  );
}
