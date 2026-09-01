import { readErrorMessage } from "../smoke/smoke-error-message.mjs";
import { normalizeSmokeReportPath } from "../smoke/smoke-report-path-config.mjs";

export const defaultReleaseRequestsManifestOutputPath =
  "artifacts/release/release-requests-manifest.json";

export function normalizeReleaseRequestsManifestOutputPath(value) {
  try {
    return normalizeSmokeReportPath(value);
  } catch (error) {
    throw new Error(
      readErrorMessage(error).replaceAll(
        "SMOKE_REPORT_PATH",
        "Release requests manifest output",
      ),
    );
  }
}
