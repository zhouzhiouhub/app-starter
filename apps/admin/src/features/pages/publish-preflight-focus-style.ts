import type { CSSProperties } from "react";
import type { PublishPreflightIssueTargetKind } from "./publish-preflight-target";

export function readPublishPreflightFocusStyle(
  area: PublishPreflightIssueTargetKind,
  highlightedArea: PublishPreflightIssueTargetKind | null,
): CSSProperties {
  const active = area === highlightedArea;

  return {
    borderRadius: 8,
    outline: active ? "2px solid #1677ff" : "2px solid transparent",
    outlineOffset: 4,
    transition: "outline-color 180ms ease",
  };
}
