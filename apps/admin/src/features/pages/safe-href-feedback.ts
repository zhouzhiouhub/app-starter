import {
  hasSensitiveUrlParameters,
  safeHrefSchema,
} from "@app-starter/schema";

export interface SafeHrefFeedback {
  help?: string;
  status?: "error";
}

const safeHrefHelp =
  "Use /path, #anchor, https://, mailto:, or tel: links.";
const sensitiveHrefParameterHelp =
  "Remove token, secret, credential, or signature parameters before publishing.";

export function readSafeHrefFeedback(
  value: string | undefined,
  options: { allowEmpty?: boolean } = {},
): SafeHrefFeedback {
  const href = value?.trim() ?? "";

  if (!href && options.allowEmpty) {
    return {};
  }

  if (safeHrefSchema.safeParse(href).success) {
    return {};
  }

  return {
    help: hasSensitiveUrlParameters(href)
      ? sensitiveHrefParameterHelp
      : safeHrefHelp,
    status: "error",
  };
}
