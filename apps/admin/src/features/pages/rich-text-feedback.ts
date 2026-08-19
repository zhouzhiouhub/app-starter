import { readSafeHrefFeedback } from "./safe-href-feedback.ts";

export interface RichTextFeedback {
  help?: string;
  status?: "warning";
}

const allowedTextTags = new Set([
  "blockquote",
  "br",
  "em",
  "h3",
  "h4",
  "li",
  "ol",
  "p",
  "strong",
  "ul",
]);
const richTextSanitizingHelp =
  "Unsupported or unsafe rich text markup will be removed in preview and published pages.";
const tagPattern = /<\/?([a-z0-9]+)\b([^>]*)>/gi;
const attributeNamePattern =
  /(?:^|\s)([a-z0-9:-]+)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>"']+)/gi;

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

function containsSanitizedRichTextMarkup(content: string): boolean {
  for (const match of content.matchAll(tagPattern)) {
    const name = match[1]?.toLowerCase();
    const rawAttributes = match[2] ?? "";
    const isClosingTag = match[0].startsWith("</");

    if (!name) {
      continue;
    }

    if (name === "a") {
      if (!isClosingTag && hasSanitizedAnchorMarkup(rawAttributes)) {
        return true;
      }

      continue;
    }

    if (!allowedTextTags.has(name)) {
      return true;
    }

    if (!isClosingTag && rawAttributes.trim()) {
      return true;
    }
  }

  return false;
}

function hasSanitizedAnchorMarkup(rawAttributes: string): boolean {
  const href = readAttribute(rawAttributes, "href");

  if (readSafeHrefFeedback(href).status) {
    return true;
  }

  const target = readAttribute(rawAttributes, "target");

  if (target && target !== "_blank") {
    return true;
  }

  return readAttributeNames(rawAttributes).some(
    (name) => name !== "href" && name !== "target",
  );
}

function readAttributeNames(rawAttributes: string): string[] {
  return Array.from(rawAttributes.matchAll(attributeNamePattern)).map(
    (match) => (match[1] ?? "").toLowerCase(),
  );
}

function readAttribute(rawAttributes: string, name: string): string | undefined {
  const pattern = new RegExp(
    `(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>"']+))`,
    "i",
  );
  const match = pattern.exec(rawAttributes);
  const value = match?.[1] ?? match?.[2] ?? match?.[3];

  return value ? decodeAttributeValue(value) : undefined;
}

function decodeAttributeValue(value: string): string {
  return value.replace(
    /&(?:#(\d+)|#x([0-9a-f]+)|amp|lt|gt|quot|apos);/gi,
    (entity, decimal: string | undefined, hexadecimal: string | undefined) => {
      if (decimal) {
        return readCodePoint(Number(decimal));
      }

      if (hexadecimal) {
        return readCodePoint(Number.parseInt(hexadecimal, 16));
      }

      switch (entity.toLowerCase()) {
        case "&amp;":
          return "&";
        case "&lt;":
          return "<";
        case "&gt;":
          return ">";
        case "&quot;":
          return '"';
        case "&apos;":
          return "'";
        default:
          return entity;
      }
    },
  );
}

function readCodePoint(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value > 0x10ffff) {
    return "";
  }

  return String.fromCodePoint(value);
}
