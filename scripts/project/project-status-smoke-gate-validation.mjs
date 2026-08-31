import { assertMissingProductionSmokeEvidenceArtifact } from "../smoke/smoke-missing-evidence-artifact-validation.mjs";
import {
  assertEnum,
  assertNonNegativeNumber,
  assertNullableString,
  assertString,
  isRecord,
} from "./project-status-validation-primitives.mjs";

const smokeMarkdownStatuses = new Set(["complete", "invalid", "missing"]);
const smokeStatuses = new Set(["blocked", "ready"]);

export function assertSmokeGate(smoke) {
  if (!isRecord(smoke)) {
    throw new Error(
      "Project status artifact releaseGate.smoke must be an object.",
    );
  }

  assertNonNegativeNumber(smoke.blockerCount, "releaseGate.smoke.blockerCount");
  assertNullableString(smoke.path, "releaseGate.smoke.path");
  assertEnum(smoke.status, smokeStatuses, "releaseGate.smoke.status");
  assertString(smoke.summaryStatus, "releaseGate.smoke.summaryStatus");
  assertOptionalSmokeMarkdown(smoke.markdown);
  assertOptionalMissingSmokeEvidence(smoke);

  if (smoke.status === "ready" && smoke.blockerCount !== 0) {
    throw new Error(
      "Project status artifact ready smoke gate must have zero blockers.",
    );
  }

  if (smoke.status === "ready" && smoke.markdown?.status !== undefined) {
    assertEnum(
      smoke.markdown.status,
      new Set(["complete"]),
      "releaseGate.smoke.markdown.status",
    );
  }
}

function assertOptionalMissingSmokeEvidence(smoke) {
  if (smoke.status === "ready" && smoke.missingEvidence !== undefined) {
    throw new Error(
      "Project status artifact ready releaseGate.smoke must not include missingEvidence.",
    );
  }

  if (smoke.missingEvidence === undefined) {
    return;
  }

  assertMissingProductionSmokeEvidenceArtifact(
    smoke.missingEvidence,
    "releaseGate.smoke.missingEvidence",
  );
}

function assertOptionalSmokeMarkdown(markdown) {
  if (markdown === undefined || markdown === null) {
    return;
  }

  if (!isRecord(markdown)) {
    throw new Error(
      "Project status artifact releaseGate.smoke.markdown must be an object when present.",
    );
  }

  assertNullableString(markdown.path, "releaseGate.smoke.markdown.path");
  assertEnum(
    markdown.status,
    smokeMarkdownStatuses,
    "releaseGate.smoke.markdown.status",
  );
  assertNonNegativeNumber(
    markdown.issueCount,
    "releaseGate.smoke.markdown.issueCount",
  );
}
