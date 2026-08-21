const attributeNamePattern = /(?:^|\s)([a-z0-9:_-]+)(?=\s*=|\s|$)/gi;
const quotedAttributeValuePattern = /"[^"]*"|'[^']*'/g;

export function hasDuplicateAttributeNames(names: string[]): boolean {
  return new Set(names).size !== names.length;
}

export function readAttributeNames(rawAttributes: string): string[] {
  const searchableAttributes = rawAttributes.replace(
    quotedAttributeValuePattern,
    " ",
  );

  return Array.from(searchableAttributes.matchAll(attributeNamePattern)).map(
    (match) => (match[1] ?? "").toLowerCase(),
  );
}

export function readAttribute(
  rawAttributes: string,
  name: string,
): string | undefined {
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
