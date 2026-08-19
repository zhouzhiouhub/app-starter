import { readSafeHrefFeedback } from "./safe-href-feedback.ts";

export interface CtaFieldFeedback {
  help?: string;
  status?: "error" | "warning";
}

const missingCtaHrefHelp = "Add a CTA link or clear the CTA label before publishing.";
const missingCtaLabelHelp = "Add a CTA label or clear the CTA link before publishing.";

export function readCtaHrefFeedback(
  labelValue: string | undefined,
  hrefValue: string | undefined,
): CtaFieldFeedback {
  const href = hrefValue?.trim() ?? "";
  const label = labelValue?.trim() ?? "";

  if (href) {
    const feedback = readSafeHrefFeedback(href);

    return feedback.status
      ? {
          help: feedback.help,
          status: "error",
        }
      : {};
  }

  if (label) {
    return {
      help: missingCtaHrefHelp,
      status: "warning",
    };
  }

  return {};
}

export function readCtaLabelFeedback(
  labelValue: string | undefined,
  hrefValue: string | undefined,
): CtaFieldFeedback {
  const href = hrefValue?.trim() ?? "";
  const label = labelValue?.trim() ?? "";

  if (!href || label) {
    return {};
  }

  return {
    help: missingCtaLabelHelp,
    status: "warning",
  };
}
