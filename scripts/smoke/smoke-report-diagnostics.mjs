import { readAdminAppFailureActions } from "./smoke-report-admin-diagnostics.mjs";

const revalidationFailureActions = new Map([
  [
    "invalid-revalidation-payload",
    "Check the API and Web revalidation payload contract.",
  ],
  [
    "missing-secret",
    "Set STOREFRONT_REVALIDATE_SECRET in both API and Web runtimes.",
  ],
  [
    "missing-url",
    "Set STOREFRONT_REVALIDATE_URL or WEB_URL to the deployed storefront.",
  ],
  [
    "request-timeout",
    "Verify the Web deployment is reachable from the API and increase timeout only after connectivity is healthy.",
  ],
  [
    "revalidation-redirect",
    "Check STOREFRONT_REVALIDATE_URL and hosting rewrites so /api/revalidate responds directly instead of redirecting.",
  ],
  [
    "revalidate-route-missing",
    "Verify the Web deployment exposes /api/revalidate at STOREFRONT_REVALIDATE_URL.",
  ],
  [
    "revalidation-secret-mismatch",
    "Make STOREFRONT_REVALIDATE_SECRET match between API and Web runtimes.",
  ],
  [
    "web-revalidation-not-configured",
    "Configure STOREFRONT_REVALIDATE_SECRET in the Web runtime.",
  ],
  [
    "web-revalidation-failed",
    "Check the Web /api/revalidate route logs for failed cache tag or path refresh operations.",
  ],
]);
const publicApiFailureActions = new Map([
  [
    "fallback-mismatch",
    "Check public page API fallback metadata for non-default locale requests.",
  ],
  [
    "locale-mismatch",
    "Check public page API locale metadata and DEFAULT_LOCALE / MULTI_LOCALE_ENABLED settings.",
  ],
  [
    "noindex-page",
    "Clear SEO noIndex on the smoke page before publishing.",
  ],
  [
    "title-mismatch",
    "Check that publish wrote the expected PageVersion and the public page API reads the current published slug.",
  ],
]);
const storefrontFailureActions = new Map([
  [
    "http-error",
    "Check WEB_URL and the storefront deployment health for the published page route.",
  ],
  [
    "noindex-page",
    "Clear SEO noIndex on the published page before production smoke.",
  ],
  [
    "published-title-missing",
    "Check the shared renderer and published Page Schema content for the smoke page.",
  ],
  [
    "request-failed",
    "Verify WEB_URL is reachable from the smoke runner and accepts the storefront host header.",
  ],
  [
    "redirect-response",
    "Check WEB_URL, storefront host routing, and hosting rewrites so published page smoke does not receive a redirect.",
  ],
  [
    "stale-or-fallback-content",
    "Check publish revalidation, ISR cache freshness, and storefront host routing.",
  ],
]);
const storefrontSeoFailureActions = new Map([
  [
    "canonical-mismatch",
    "Check SMOKE_STOREFRONT_HOST / WEB_URL and storefront canonical/Open Graph URL metadata generation.",
  ],
  [
    "open-graph-url-mismatch",
    "Check SMOKE_STOREFRONT_HOST / WEB_URL and storefront canonical/Open Graph URL metadata generation.",
  ],
  [
    "noindex-page",
    "Clear SEO noIndex on the published page before production smoke.",
  ],
]);

export function readFailureActions(details) {
  const actions = details.flatMap((detail) => {
    const action = readRevalidationFailureAction(detail.details);

    return [
      ...(action ? [action] : []),
      ...readAdminAppFailureActions(detail.details),
      ...readMediaFailureActions(detail.details),
      ...readPublicApiFailureActions(detail.details),
      ...readStorefrontFailureActions(detail.details),
    ];
  });

  return [...new Set(actions)];
}

export function readFailureDiagnosis(details) {
  return (
    readRevalidationDiagnosis(details) ??
    readPublicApiDiagnosis(details) ??
    readStorefrontDiagnosis(details) ??
    readStorefrontSeoDiagnosis(details)
  );
}

function readRevalidationFailureAction(details) {
  const diagnosis = readRevalidationDiagnosis(details);
  return diagnosis ? revalidationFailureActions.get(diagnosis) : undefined;
}

function readMediaFailureActions(details) {
  const media = readPlainRecord(details.media);
  const uploadTarget = readPlainRecord(details.mediaUploadTarget);
  const actions = [];

  if (uploadTarget.isR2UploadUrl === false) {
    actions.push(
      "Configure R2 upload variables so /media/upload-url returns a Cloudflare R2 presigned PUT URL.",
    );
  }

  if (uploadTarget.uploadUrlMatchesR2Key === false) {
    actions.push(
      "Check R2 object-key signing so the presigned upload URL path matches the returned r2Key.",
    );
  }

  if (media.productionCdn === false) {
    actions.push(
      "Set MEDIA_CDN_BASE_URL to a production HTTPS CDN host before requiring R2 smoke.",
    );
  }

  if (media.assetR2KeyMatchesTarget === false) {
    actions.push("Check media confirm persistence so the returned r2Key matches the upload target r2Key.");
  }

  if (media.cdnUrlMatchesR2Key === false) {
    actions.push(
      "Check media confirm URL generation so the CDN URL points to the confirmed R2 key.",
    );
  }

  if (media.cdnHostMatchesExpected === false) {
    actions.push(
      "Check API MEDIA_CDN_BASE_URL matches the CDN host used in media confirm responses.",
    );
  }

  if (media.cdnPathMatchesExpected === false) {
    actions.push(
      "Check API MEDIA_CDN_BASE_URL path prefix matches the CDN URL path used in media confirm responses.",
    );
  }

  return actions;
}

function readRevalidationDiagnosis(details) {
  const revalidation = readPlainRecord(details.revalidation);
  return typeof revalidation.diagnosis === "string" &&
    revalidation.diagnosis.length > 0
    ? revalidation.diagnosis
    : null;
}

function readPublicApiFailureActions(details) {
  const diagnosis = readPublicApiDiagnosis(details);
  const action = diagnosis ? publicApiFailureActions.get(diagnosis) : undefined;

  return action ? [action] : [];
}

function readPublicApiDiagnosis(details) {
  const publicApi = readPlainRecord(details.publicApi);
  return typeof publicApi.diagnosis === "string" &&
    publicApi.diagnosis.length > 0
    ? publicApi.diagnosis
    : null;
}

function readStorefrontFailureActions(details) {
  const actions = [
    readStorefrontAction(details),
    readStorefrontSeoAction(details),
    ...readRobotsActions(details),
    ...readSitemapActions(details),
    ...readNotFoundActions(details),
  ].filter((action) => typeof action === "string");

  return actions;
}

function readStorefrontAction(details) {
  const diagnosis = readStorefrontDiagnosis(details);
  return diagnosis ? storefrontFailureActions.get(diagnosis) : undefined;
}

function readStorefrontDiagnosis(details) {
  const storefront = readPlainRecord(details.storefront);
  return typeof storefront.diagnosis === "string" &&
    storefront.diagnosis.length > 0
    ? storefront.diagnosis
    : null;
}

function readStorefrontSeoAction(details) {
  const diagnosis = readStorefrontSeoDiagnosis(details);
  return diagnosis ? storefrontSeoFailureActions.get(diagnosis) : undefined;
}

function readStorefrontSeoDiagnosis(details) {
  const storefrontSeo = readPlainRecord(details.storefrontSeo);
  return typeof storefrontSeo.diagnosis === "string" &&
    storefrontSeo.diagnosis.length > 0
    ? storefrontSeo.diagnosis
    : null;
}

function readRobotsActions(details) {
  const robots = readPlainRecord(details.robots);
  const actions = [];

  if (robots.hasUserAgent === false || robots.hasHostLine === false) {
    actions.push("Check robots.txt generation includes User-agent and Host lines.");
  }

  if (robots.pointsToHost === false) {
    actions.push("Check robots.txt Host uses the expected storefront origin.");
  }

  if (robots.hasSitemapLine === false || robots.pointsToSitemap === false) {
    actions.push("Check robots.txt Sitemap points to the storefront sitemap URL.");
  }

  return actions;
}

function readSitemapActions(details) {
  const sitemap = readPlainRecord(details.sitemap);
  const actions = [];

  if (sitemap.expectedUrlPresent === false) {
    actions.push(
      "Check sitemap generation includes the published smoke page URL after publish/revalidation.",
    );
  }

  if (sitemap.notFoundUrlPresent === true) {
    actions.push("Exclude the 404 system page from sitemap output.");
  }

  if (sitemap.offOriginUrlCount > 0) {
    actions.push(
      "Ensure sitemap URLs use the expected storefront origin only.",
    );
  }

  return actions;
}

function readNotFoundActions(details) {
  const notFound = readPlainRecord(details.notFound);
  const actions = [];

  if (notFound.status !== undefined && notFound.status !== 404) {
    actions.push("Ensure unknown storefront routes return HTTP 404.");
  }

  if (notFound.noIndex === false) {
    actions.push("Ensure the storefront 404 page renders noindex robots metadata.");
  }

  return actions;
}

function readPlainRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}
