import type { CSSProperties } from "react";

export function readPublishPreflightFieldDomId(field: string): string {
  return `publish-field:${field}`;
}

export function readPublishPreflightFieldStyle(
  field: string,
  highlightedField: string | null,
): CSSProperties {
  const active = field === highlightedField;

  return {
    borderRadius: 6,
    outline: active ? "2px solid #1677ff" : "2px solid transparent",
    outlineOffset: 2,
    scrollMarginTop: 16,
    transition: "outline-color 180ms ease",
  };
}

export function readPublishPreflightFieldProps(
  field: string,
  highlightedField: string | null,
) {
  return {
    id: readPublishPreflightFieldDomId(field),
    style: readPublishPreflightFieldStyle(field, highlightedField),
  };
}
