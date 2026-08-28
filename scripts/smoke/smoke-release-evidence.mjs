const releaseTraceabilityGroups = [
  {
    blockerAreas: ["media.r2", "media.cdn", "media.external-hosts"],
    checks: ["media.upload-target"],
    detailIssues: readR2CdnEvidenceIssues,
    label: "R2/CDN",
  },
  {
    blockerAreas: ["deployment.admin"],
    checks: ["admin.app"],
    detailIssues: readAdminAppEvidenceIssues,
    label: "Admin static app",
  },
  {
    blockerAreas: [
      "deployment.api",
      "deployment.web",
      "revalidation",
      "revalidation.secret",
      "revalidation.url",
    ],
    checks: [
      "api.health",
      "auth.login",
      "feature-flags.disabled",
      "page.preview",
      "page.publish",
      "page.rollback",
      "audit.logs",
      "public-page.api",
      "public-page.fallback-api",
      "starter-pages.published",
      "storefront.page",
      "seo.robots",
      "seo.sitemap",
      "seo.not-found",
    ],
    detailIssues: readPublishFlowEvidenceIssues,
    label: "Publish flow",
  },
];

export function readReleaseTraceabilityGroups(report) {
  return releaseTraceabilityGroups.map((group) =>
    readTraceabilityGroup(report, group),
  );
}

function readTraceabilityGroup(report, group) {
  const checks = group.checks.map((name) => readCheckState(report, name));
  const failedChecks = checks.filter((check) => check.status === "failed");
  const missingChecks = checks.filter((check) => check.status === "missing");
  const blockers = readReadinessBlockers(report, group.blockerAreas);
  const detailIssues = group.detailIssues(report);
  const status = readTraceabilityStatus({
    blockers,
    detailIssues,
    failedChecks,
    missingChecks,
  });

  return {
    action: readTraceabilityAction({
      blockers,
      detailIssues,
      failedChecks,
      group,
      missingChecks,
    }),
    label: group.label,
    status,
  };
}

function readTraceabilityStatus(input) {
  if (input.failedChecks.length > 0) {
    return "failed";
  }

  if (input.missingChecks.length > 0) {
    return "missing";
  }

  if (input.blockers.length > 0) {
    return "blocked";
  }

  if (input.detailIssues.length > 0) {
    return "incomplete";
  }

  return "passed";
}

function readTraceabilityAction(input) {
  if (input.failedChecks.length > 0) {
    return `Fix failed ${input.group.label} checks: ${formatCheckNames(
      input.failedChecks,
    )}.`;
  }

  if (input.missingChecks.length > 0) {
    return `Rerun production smoke so it records ${input.group.label} checks: ${formatCheckNames(
      input.missingChecks,
    )}.`;
  }

  if (input.blockers.length > 0) {
    return `Resolve ${input.group.label} production readiness blockers: ${input.blockers
      .map((blocker) => `${blocker.area}/${blocker.issue ?? "unknown"}`)
      .join(", ")}.`;
  }

  if (input.detailIssues.length > 0) {
    return input.detailIssues[0];
  }

  return `${input.group.label} traceability passed.`;
}

function readR2CdnEvidenceIssues(report) {
  return readBooleanEvidenceIssues(
    readCheckDetails(report, "media.upload-target"),
    [
      ["uploadedObject", "media.upload-target did not prove uploadedObject=true."],
      ["isR2UploadUrl", "media.upload-target did not prove a Cloudflare R2 presigned upload URL."],
      ["uploadUrlMatchesR2Key", "media.upload-target did not prove the upload URL matches the returned R2 key."],
      ["assetR2KeyMatchesTarget", "media.upload-target did not prove the confirmed asset matches the upload target R2 key."],
      ["cdnUrlMatchesR2Key", "media.upload-target did not prove the CDN URL points to the uploaded R2 key."],
      ["productionCdn", "media.upload-target did not prove a production HTTPS CDN URL."],
    ],
  );
}

function readAdminAppEvidenceIssues(report) {
  return readBooleanEvidenceIssues(readCheckDetails(report, "admin.app"), [
    ["ok", "admin.app did not prove the Admin shell returned a successful response."],
    ["hasHtmlContentType", "admin.app did not prove HTML content type."],
    ["hasRootElement", "admin.app did not prove the React root element exists."],
    ["hasModuleScript", "admin.app did not prove a module script reference exists."],
    ["moduleScriptOk", "admin.app did not prove the module script is reachable."],
    ["moduleScriptHasJavaScriptContentType", "admin.app did not prove JavaScript content type for the module script."],
    ["modulePreloadOk", "admin.app did not prove modulepreload assets are reachable."],
    ["stylesheetOk", "admin.app did not prove stylesheet assets are reachable."],
  ]);
}

function readPublishFlowEvidenceIssues(report) {
  return ["page.publish", "page.rollback"].flatMap((name) =>
    readRevalidationEvidenceIssues(report, name),
  );
}

function readRevalidationEvidenceIssues(report, checkName) {
  const revalidation = readPlainRecord(
    readCheckDetails(report, checkName).revalidation,
  );

  if (!Object.keys(revalidation).length) {
    return [`${checkName} did not capture ISR revalidation evidence.`];
  }

  return readBooleanEvidenceIssues(revalidation, [
    ["required", `${checkName} did not prove revalidation was required.`],
    ["triggered", `${checkName} did not prove revalidation was triggered.`],
  ]);
}

function readBooleanEvidenceIssues(details, expectations) {
  return expectations
    .filter(([key]) => details[key] !== true)
    .map(([, message]) => message);
}

function readCheckState(report, name) {
  const check = readCheck(report, name);

  return {
    name,
    status:
      check?.status === "passed" || check?.status === "failed"
        ? check.status
        : "missing",
  };
}

function readCheckDetails(report, name) {
  return readPlainRecord(readCheck(report, name)?.details);
}

function readCheck(report, name) {
  return Array.isArray(report?.checks)
    ? report.checks.find((check) => check?.name === name)
    : null;
}

function readReadinessBlockers(report, areas) {
  const blockers = Array.isArray(report?.productionReadiness?.blockers)
    ? report.productionReadiness.blockers
    : [];

  return blockers.filter((blocker) => areas.includes(blocker?.area));
}

function readPlainRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function formatCheckNames(checks) {
  return checks.map((check) => check.name).join(", ");
}
