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
const tagPattern = /<\/?[^>]+>/g;

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

function sanitizeTag(tag: string): SanitizedTag {
  const parsed = /^<\s*(\/?)\s*([a-z0-9]+)\b([^>]*)>/i.exec(tag);

  if (!parsed) {
    return { html: "" };
  }

  const [, closingSlash, rawName, rawAttributes = ""] = parsed;

  if (!rawName) {
    return { html: "" };
  }

  const name = rawName.toLowerCase();

  if (name === "a") {
    return closingSlash
      ? { closingAnchor: true, html: "</a>" }
      : sanitizeAnchorTag(rawAttributes);
  }

  if (!allowedTextTags.has(name)) {
    return { html: "" };
  }

  if (name === "br") {
    return { html: "<br>" };
  }

  return { html: closingSlash ? `</${name}>` : `<${name}>` };
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

  return match?.[1] ?? match?.[2] ?? match?.[3];
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
