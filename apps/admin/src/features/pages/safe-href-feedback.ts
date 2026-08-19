import { safeHrefSchema } from "@app-starter/schema";

export interface SafeHrefFeedback {
  help?: string;
  status?: "error";
}

const safeHrefHelp =
  "Use /path, #anchor, https://, mailto:, or tel: links.";

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
    help: safeHrefHelp,
    status: "error",
  };
}
