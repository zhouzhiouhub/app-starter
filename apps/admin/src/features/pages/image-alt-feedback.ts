export interface ImageAltFeedback {
  help?: string;
  status?: "warning";
}

const missingImageAltHelp = "Add alt text for accessibility before publishing.";

export function readImageAltFeedback(
  value: string | undefined,
  options: { allowEmpty?: boolean } = {},
): ImageAltFeedback {
  const alt = value?.trim() ?? "";

  if (alt || options.allowEmpty) {
    return {};
  }

  return {
    help: missingImageAltHelp,
    status: "warning",
  };
}
