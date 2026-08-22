export function createSmokeReportSummary(report) {
  const checks = Array.isArray(report?.checks) ? report.checks : [];
  const failedCheckEntries = checks.filter(
    (check) => check?.status === "failed",
  );
  const failedChecks = failedCheckEntries.map((check, index) =>
    readCheckName(check, index),
  );
  const failedCheckDetails = failedCheckEntries.map((check, index) =>
    readFailedCheckDetails(check, index),
  );
  const passedCheckCount = checks.filter(
    (check) => check?.status === "passed",
  ).length;
  const readiness = readPlainRecord(report?.productionReadiness);

  return {
    blockerCount: readArrayLength(readiness.blockers),
    checkCount: checks.length,
    failedCheckCount: failedCheckEntries.length,
    failedCheckDetails,
    failedChecks,
    passedCheckCount,
    productionReady: readiness.productionReady === true,
    status: typeof report?.status === "string" ? report.status : "unknown",
    warningCount: readArrayLength(readiness.warnings),
  };
}

export function refreshSmokeReportSummary(report) {
  report.summary = createSmokeReportSummary(report);
  return report.summary;
}

function readCheckName(check, index) {
  return typeof check?.name === "string" && check.name.length > 0
    ? check.name
    : `unnamed-check-${index + 1}`;
}

function readFailedCheckDetails(check, index) {
  return {
    details: readPlainRecord(check?.details),
    message: readCheckErrorMessage(check),
    name: readCheckName(check, index),
  };
}

function readCheckErrorMessage(check) {
  return typeof check?.error?.message === "string" &&
    check.error.message.length > 0
    ? check.error.message
    : null;
}

function readArrayLength(value) {
  return Array.isArray(value) ? value.length : 0;
}

function readPlainRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}
