import { readSafeHref } from "./safe-href.js";

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
const removableContentTags =
  /<\s*(script|style|iframe|object|embed|svg|math)\b[\s\S]*?<\s*\/\s*\1\s*>/gi;
const remainingBlockedTags =
  /<\s*\/?\s*(script|style|iframe|object|embed|svg|math|link|meta)\b[^>]*>/gi;
const attributeNamePattern = /(?:^|\s)([a-z0-9:_-]+)(?=\s*=|\s|$)/gi;
const quotedAttributeValuePattern = /"[^"]*"|'[^']*'/g;
const tagPattern = /<\/?[^>]+>/g;

interface RichTextTag {
  closing: boolean;
  name: string;
  rawAttributes: string;
}

interface SanitizedTag {
  blockedAnchor?: boolean;
  closingAnchor?: boolean;
  html: string;
}

export function sanitizeRichText(value: string): string {
  const input = value
    .replace(removableContentTags, "")
    .replace(remainingBlockedTags, "");
  let output = "";
  let cursor = 0;
  let blockedAnchorDepth = 0;

  for (const match of input.matchAll(tagPattern)) {
    const sanitized = sanitizeTag(match[0]);

    output += escapeText(input.slice(cursor, match.index));

    if (sanitized.blockedAnchor) {
      blockedAnchorDepth += 1;
    } else if (sanitized.closingAnchor && blockedAnchorDepth > 0) {
      blockedAnchorDepth -= 1;
    } else {
      output += sanitized.html;
    }

    cursor = (match.index ?? 0) + match[0].length;
  }

  output += escapeText(input.slice(cursor));

  return output;
}

export function containsSanitizedRichTextMarkup(value: string): boolean {
  for (const match of value.matchAll(tagPattern)) {
    const parsed = parseRichTextTag(match[0]);

    if (!parsed) {
      continue;
    }

    if (parsed.name === "a") {
      if (!parsed.closing && hasSanitizedAnchorMarkup(parsed.rawAttributes)) {
        return true;
      }

      continue;
    }

    if (!allowedTextTags.has(parsed.name)) {
      return true;
    }

    if (!parsed.closing && parsed.rawAttributes.trim()) {
      return true;
    }
  }

  return false;
}

function sanitizeTag(tag: string): SanitizedTag {
  const parsed = parseRichTextTag(tag);

  if (!parsed) {
    return { html: "" };
  }

  if (parsed.name === "a") {
    return parsed.closing
      ? { closingAnchor: true, html: "</a>" }
      : sanitizeAnchorTag(parsed.rawAttributes);
  }

  if (!allowedTextTags.has(parsed.name)) {
    return { html: "" };
  }

  if (parsed.name === "br") {
    return { html: "<br>" };
  }

  return {
    html: parsed.closing ? `</${parsed.name}>` : `<${parsed.name}>`,
  };
}

function parseRichTextTag(tag: string): RichTextTag | null {
  const parsed = /^<\s*(\/?)\s*([a-z0-9]+)\b([^>]*)>/i.exec(tag);
  const name = parsed?.[2]?.toLowerCase();

  if (!parsed || !name) {
    return null;
  }

  return {
    closing: Boolean(parsed[1]),
    name,
    rawAttributes: parsed[3] ?? "",
  };
}

function hasSanitizedAnchorMarkup(rawAttributes: string): boolean {
  const href = readSafeHref(readAttribute(rawAttributes, "href"));

  if (!href) {
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
  const searchableAttributes = rawAttributes.replace(
    quotedAttributeValuePattern,
    " ",
  );

  return Array.from(searchableAttributes.matchAll(attributeNamePattern)).map(
    (match) => (match[1] ?? "").toLowerCase(),
  );
}

function sanitizeAnchorTag(rawAttributes: string): SanitizedTag {
  const href = readSafeHref(readAttribute(rawAttributes, "href"));

  if (!href) {
    return { blockedAnchor: true, html: "" };
  }

  const target = readAttribute(rawAttributes, "target");

  if (target === "_blank") {
    return {
      html: `<a href="${escapeAttribute(href)}" target="_blank" rel="noopener noreferrer">`,
    };
  }

  return { html: `<a href="${escapeAttribute(href)}">` };
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

function escapeText(value: string | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeText(value).replace(/"/g, "&quot;");
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
