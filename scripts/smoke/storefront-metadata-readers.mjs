export function readCanonicalHref(html) {
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = readHtmlAttribute(tag, "rel");

    if (
      !rel
        ?.split(/\s+/)
        .some((value) => value.toLowerCase() === "canonical")
    ) {
      continue;
    }

    return readHtmlAttribute(tag, "href");
  }

  return null;
}

export function readOpenGraphUrl(html) {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const property = readHtmlAttribute(tag, "property");

    if (property?.toLowerCase() !== "og:url") {
      continue;
    }

    return readHtmlAttribute(tag, "content");
  }

  return null;
}

function readHtmlAttribute(tag, name) {
  const pattern = new RegExp(
    `\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i",
  );
  const match = pattern.exec(tag);
  const value = match?.[1] ?? match?.[2] ?? match?.[3];
  const normalized = value?.replace(/\s+/g, " ").trim();

  return normalized || null;
}
