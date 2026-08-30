import { formatSmokeText } from "../smoke/smoke-text.mjs";

const maxMarkdownTextLength = 420;

export function formatSmokeMarkdownSummary(markdown) {
  if (!markdown) {
    return ["- Report Markdown: not recorded"];
  }

  return [
    `- Report Markdown: ${formatText(markdown.status)} ${formatNullableCode(
      markdown.path,
    )}`,
  ];
}

function formatNullableCode(value) {
  return value ? formatCode(value) : "not recorded";
}

function formatCode(value) {
  return `\`${formatText(value).replaceAll("`", "'")}\``;
}

function formatText(value) {
  return formatSmokeText(value, {
    fallback: "unknown",
    maxLength: maxMarkdownTextLength,
  });
}
