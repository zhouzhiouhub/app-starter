import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { PageSchema } from "@app-starter/schema";
import type { PublishPreflightIssue } from "../publish-preflight";
import {
  readPublishPreflightIssueTarget,
  type PublishPreflightIssueTargetKind,
  type PublishPreflightIssueTarget,
} from "../publish-preflight-target";

const highlightDurationMs = 2000;

export function usePublishPreflightFocus(input: {
  schema: PageSchema;
  setSelectedSectionId: Dispatch<SetStateAction<string | null>>;
}) {
  const { schema, setSelectedSectionId } = input;
  const [highlightedArea, setHighlightedArea] =
    useState<PublishPreflightIssueTargetKind | null>(null);
  const chromeSettingsRef = useRef<HTMLDivElement>(null);
  const highlightTimerRef = useRef<number | null>(null);
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
      refreshHighlightedArea(target.kind, {
        setHighlightedArea,
        timerRef: highlightTimerRef,
      });

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

  useEffect(
    () => () => {
      clearHighlightTimer(highlightTimerRef);
    },
    [],
  );

  return {
    chromeSettingsRef,
    handleTargetSelect,
    highlightedArea,
    pageContentRef,
    previewRef,
    readIssueTarget,
    sectionPropertiesRef,
    seoSettingsRef,
  };
}

function refreshHighlightedArea(
  area: PublishPreflightIssueTargetKind,
  input: {
    setHighlightedArea: Dispatch<
      SetStateAction<PublishPreflightIssueTargetKind | null>
    >;
    timerRef: MutableRefObject<number | null>;
  },
): void {
  clearHighlightTimer(input.timerRef);
  input.setHighlightedArea(area);
  input.timerRef.current = window.setTimeout(
    () => input.setHighlightedArea(null),
    highlightDurationMs,
  );
}

function clearHighlightTimer(
  timerRef: MutableRefObject<number | null>,
): void {
  if (timerRef.current === null) {
    return;
  }

  window.clearTimeout(timerRef.current);
  timerRef.current = null;
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
