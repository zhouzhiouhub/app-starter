import { containsSanitizedRichTextMarkup } from "@app-starter/ui";

export interface RichTextFeedback {
  help?: string;
  status?: "warning";
}

const richTextSanitizingHelp =
  "Unsupported or unsafe rich text markup will be removed in preview and published pages.";

export function readRichTextFeedback(
  value: string | undefined,
): RichTextFeedback {
  const content = value?.trim() ?? "";

  if (!content || !containsSanitizedRichTextMarkup(content)) {
    return {};
  }

  return {
    help: richTextSanitizingHelp,
    status: "warning",
  };
}
