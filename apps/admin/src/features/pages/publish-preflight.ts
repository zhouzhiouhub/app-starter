import type { PageSchema } from "@app-starter/schema";
import { readSafeHrefFeedback } from "./safe-href-feedback.ts";
import { readSeoFieldFeedback } from "./seo-feedback.ts";
import type { SeoField } from "./seo-updates";

export type PublishPreflightSeverity = "error" | "warning";

export interface PublishPreflightIssue {
  field: string;
  message: string;
  severity: PublishPreflightSeverity;
}

interface SafeHrefCheck {
  allowEmpty?: boolean;
  field: string;
  label: string;
  value: string | undefined;
}

interface SeoCheck {
  field: SeoField;
  label: string;
  value: string | undefined;
}

export function collectPublishPreflightIssues(
  schema: PageSchema,
): PublishPreflightIssue[] {
  const issues: PublishPreflightIssue[] = [];

  collectChromeIssues(schema, issues);
  collectSeoIssues(schema, issues);

  return issues;
}

export function findBlockingPublishPreflightIssue(
  schema: PageSchema,
): PublishPreflightIssue | null {
  return (
    collectPublishPreflightIssues(schema).find(
      (issue) => issue.severity === "error",
    ) ?? null
  );
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
): void {
  addSeoIssue(issues, {
    field: "canonical",
    label: "Canonical URL",
    value: schema.seo.canonical,
  });
  addSeoIssue(issues, {
    field: "ogImage",
    label: "Open Graph image",
    value: schema.seo.ogImage,
  });
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
  const feedback = readSeoFieldFeedback(check.field, check.value);

  if (!feedback.status) {
    return;
  }

  issues.push({
    field: `seo.${check.field}`,
    message: `${check.label}: ${feedback.help ?? "Enter a valid SEO value."}`,
    severity: feedback.status,
  });
}
