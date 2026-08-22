import { useCallback, useRef, type Dispatch, type SetStateAction } from "react";
import type { PageSchema } from "@app-starter/schema";
import type { PublishPreflightIssue } from "../publish-preflight";
import {
  readPublishPreflightIssueTarget,
  type PublishPreflightIssueTarget,
} from "../publish-preflight-target";

export function usePublishPreflightFocus(input: {
  schema: PageSchema;
  setSelectedSectionId: Dispatch<SetStateAction<string | null>>;
}) {
  const { schema, setSelectedSectionId } = input;
  const chromeSettingsRef = useRef<HTMLDivElement>(null);
  const pageContentRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const sectionPropertiesRef = useRef<HTMLDivElement>(null);
  const seoSettingsRef = useRef<HTMLDivElement>(null);
  const readIssueTarget = useCallback(
    (issue: PublishPreflightIssue) =>
      readPublishPreflightIssueTarget(issue, schema),
    [schema],
  );
  const handleTargetSelect = useCallback(
    (target: PublishPreflightIssueTarget) => {
      if (target.kind === "section" && target.sectionId) {
        setSelectedSectionId(target.sectionId);
        scrollToEditorArea(sectionPropertiesRef.current);
        return;
      }

      if (target.kind === "seo") {
        scrollToEditorArea(seoSettingsRef.current);
        return;
      }

      if (target.kind === "chrome") {
        scrollToEditorArea(chromeSettingsRef.current);
        return;
      }

      if (target.kind === "media") {
        scrollToEditorArea(previewRef.current);
        return;
      }

      scrollToEditorArea(pageContentRef.current);
    },
    [setSelectedSectionId],
  );

  return {
    chromeSettingsRef,
    handleTargetSelect,
    pageContentRef,
    previewRef,
    readIssueTarget,
    sectionPropertiesRef,
    seoSettingsRef,
  };
}

function scrollToEditorArea(element: HTMLElement | null): void {
  if (!element) {
    return;
  }

  const scroll = () =>
    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(scroll);
    return;
  }

  window.setTimeout(scroll, 0);
}
