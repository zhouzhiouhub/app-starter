import {
  defaultRuntimeConfig,
  type PageSchema,
} from "@app-starter/schema";
import {
  type PublishPreflightIssue,
  type PublishPreflightSeverity,
} from "./publish-preflight-types.ts";
import { readSafeHrefFeedback } from "./safe-href-feedback.ts";
import { readSeoFieldFeedback } from "./seo-feedback.ts";
import { collectPageStructurePreflightIssues } from "./page-structure-publish-preflight.ts";
import { collectSectionPreflightIssues } from "./section-publish-preflight.ts";
import type { SeoField } from "./seo-updates";
import {
  readStorefrontPageOrigin,
  type WebOriginInput,
} from "./storefront-page-origin.ts";

export type { PublishPreflightIssue, PublishPreflightSeverity };

interface SafeHrefCheck {
  allowEmpty?: boolean;
  field: string;
  label: string;
  value: string | undefined;
}

interface SeoCheck {
  field: SeoField;
  label: string;
  storefrontOrigin?: string | null;
  value: string | undefined;
}

export interface PublishPreflightOptions {
  defaultLocale?: string;
  multiLocaleEnabled?: boolean;
  siteDomain?: string | null;
  storefrontRuntime?: WebOriginInput;
}

export interface PublishPreflightIssueSummary {
  errorCount: number;
  message: string;
  status: "blocked" | "ready" | "warning";
  warningCount: number;
}

export function collectPublishPreflightIssues(
  schema: PageSchema,
  options: PublishPreflightOptions = {},
): PublishPreflightIssue[] {
  const issues: PublishPreflightIssue[] = [];

  collectLocaleIssues(schema, issues, options);
  issues.push(...collectPageStructurePreflightIssues(schema));
  collectChromeIssues(schema, issues);
  collectSeoIssues(schema, issues, options);
  issues.push(...collectSectionPreflightIssues(schema));

  return issues;
}

export function findBlockingPublishPreflightIssue(
  schema: PageSchema,
  options: PublishPreflightOptions = {},
): PublishPreflightIssue | null {
  return findBlockingPublishPreflightIssueFromIssues(
    collectPublishPreflightIssues(schema, options),
  );
}

export function findBlockingPublishPreflightIssueFromIssues(
  issues: PublishPreflightIssue[],
): PublishPreflightIssue | null {
  return issues.find((issue) => issue.severity === "error") ?? null;
}

export function formatPublishPreflightWarningSummary(
  issues: PublishPreflightIssue[],
): string | null {
  const warnings = issues.filter((issue) => issue.severity === "warning");

  if (warnings.length === 0) {
    return null;
  }

  const visibleWarnings = warnings.slice(0, 3);
  const remainingCount = warnings.length - visibleWarnings.length;
  const warningLabel = warnings.length === 1 ? "warning" : "warnings";
  const remainingSuffix =
    remainingCount > 0
      ? ` ${remainingCount} more ${remainingCount === 1 ? "warning" : "warnings"} also ${
          remainingCount === 1 ? "needs" : "need"
        } review.`
      : "";

  return `Review ${warnings.length} non-blocking publish ${warningLabel}: ${visibleWarnings
    .map((issue) => issue.message)
    .join(" ")}${remainingSuffix}`;
}

export function summarizePublishPreflightIssues(
  issues: PublishPreflightIssue[],
): PublishPreflightIssueSummary {
  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter(
    (issue) => issue.severity === "warning",
  ).length;

  if (errorCount > 0) {
    return {
      errorCount,
      message: `Publish blocked by ${formatIssueCount(
        errorCount,
        "error",
      )}${formatWarningCount(warningCount)}.`,
      status: "blocked",
      warningCount,
    };
  }

  if (warningCount > 0) {
    return {
      errorCount,
      message: `Publish has ${formatIssueCount(
        warningCount,
        "non-blocking warning",
      )}.`,
      status: "warning",
      warningCount,
    };
  }

  return {
    errorCount,
    message: "Publish checks passed.",
    status: "ready",
    warningCount,
  };
}

function formatIssueCount(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function formatWarningCount(count: number): string {
  return count > 0
    ? ` and ${formatIssueCount(count, "non-blocking warning")}`
    : "";
}

function collectLocaleIssues(
  schema: PageSchema,
  issues: PublishPreflightIssue[],
  options: PublishPreflightOptions,
): void {
  const defaultLocale = options.defaultLocale ?? defaultRuntimeConfig.defaultLocale;
  const multiLocaleEnabled =
    options.multiLocaleEnabled ?? defaultRuntimeConfig.multiLocaleEnabled;

  if (multiLocaleEnabled || schema.meta.locale === defaultLocale) {
    return;
  }

  issues.push({
    field: "meta.locale",
    message: `Locale ${schema.meta.locale} cannot be published while multi-locale is disabled. Use ${defaultLocale} or enable multi-locale before publishing.`,
    severity: "error",
  });
}

function collectChromeIssues(
  schema: PageSchema,
  issues: PublishPreflightIssue[],
): void {
  const header = schema.chrome.header.content;
  const footer = schema.chrome.footer.content;

  addSafeHrefIssue(issues, {
    field: "chrome.header.content.brand.href",
    label: "Header brand link",
    value: header.brand.href,
  });

  header.navigation.forEach((item, index) => {
    addSafeHrefIssue(issues, {
      field: `chrome.header.content.navigation[${index}].href`,
      label: `Header navigation link ${index + 1}`,
      value: item.href,
    });
  });

  header.localeSwitcher.locales.forEach((locale, index) => {
    addSafeHrefIssue(issues, {
      allowEmpty: true,
      field: `chrome.header.content.localeSwitcher.locales[${index}].href`,
      label: `Locale switcher link ${index + 1}`,
      value: locale.href,
    });
  });

  addSafeHrefIssue(issues, {
    field: "chrome.footer.content.brand.href",
    label: "Footer brand link",
    value: footer.brand.href,
  });

  footer.navigation.forEach((item, index) => {
    addSafeHrefIssue(issues, {
      field: `chrome.footer.content.navigation[${index}].href`,
      label: `Footer navigation link ${index + 1}`,
      value: item.href,
    });
  });
}

function collectSeoIssues(
  schema: PageSchema,
  issues: PublishPreflightIssue[],
  options: PublishPreflightOptions,
): void {
  const storefrontOrigin = hasStorefrontOriginContext(options)
    ? readStorefrontPageOrigin({
        locale: schema.meta.locale,
        runtime: options.storefrontRuntime,
        siteDomain: options.siteDomain,
        slug: schema.meta.slug,
      })
    : null;

  addSeoIssue(issues, {
    field: "canonical",
    label: "Canonical URL",
    storefrontOrigin,
    value: schema.seo.canonical,
  });
  addSeoIssue(issues, {
    field: "ogImage",
    label: "Open Graph image",
    value: schema.seo.ogImage,
  });
}

function hasStorefrontOriginContext(options: PublishPreflightOptions): boolean {
  return "siteDomain" in options || options.storefrontRuntime !== undefined;
}

function addSafeHrefIssue(
  issues: PublishPreflightIssue[],
  check: SafeHrefCheck,
): void {
  const feedback = readSafeHrefFeedback(check.value, {
    allowEmpty: check.allowEmpty,
  });

  if (!feedback.status) {
    return;
  }

  issues.push({
    field: check.field,
    message: `${check.label}: ${feedback.help ?? "Enter a valid link."}`,
    severity: feedback.status,
  });
}

function addSeoIssue(
  issues: PublishPreflightIssue[],
  check: SeoCheck,
): void {
  const feedback = readSeoFieldFeedback(check.field, check.value, {
    storefrontOrigin: check.storefrontOrigin,
  });

  if (!feedback.status) {
    return;
  }

  issues.push({
    field: `seo.${check.field}`,
    message: `${check.label}: ${feedback.help ?? "Enter a valid SEO value."}`,
    severity: feedback.status,
  });
}
