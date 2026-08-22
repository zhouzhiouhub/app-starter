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
import { readPublishPreflightFieldDomId } from "../publish-preflight-field-focus";

const highlightDurationMs = 2000;

export function usePublishPreflightFocus(input: {
  schema: PageSchema;
  setSelectedSectionId: Dispatch<SetStateAction<string | null>>;
}) {
  const { schema, setSelectedSectionId } = input;
  const [highlightedArea, setHighlightedArea] =
    useState<PublishPreflightIssueTargetKind | null>(null);
  const [highlightedField, setHighlightedField] = useState<string | null>(null);
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
      refreshHighlightedTarget(target, {
        setHighlightedArea,
        setHighlightedField,
        timerRef: highlightTimerRef,
      });
      const fallbackElement = readFallbackElement(target.kind, {
        chromeSettingsRef,
        pageContentRef,
        previewRef,
        sectionPropertiesRef,
        seoSettingsRef,
      });

      if (target.kind === "section" && target.sectionId) {
        setSelectedSectionId(target.sectionId);
        scrollToPublishField(target.field, fallbackElement);
        return;
      }

      scrollToPublishField(target.field, fallbackElement);
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
    highlightedField,
    pageContentRef,
    previewRef,
    readIssueTarget,
    sectionPropertiesRef,
    seoSettingsRef,
  };
}

function refreshHighlightedTarget(
  target: PublishPreflightIssueTarget,
  input: {
    setHighlightedArea: Dispatch<
      SetStateAction<PublishPreflightIssueTargetKind | null>
    >;
    setHighlightedField: Dispatch<SetStateAction<string | null>>;
    timerRef: MutableRefObject<number | null>;
  },
): void {
  clearHighlightTimer(input.timerRef);
  input.setHighlightedArea(target.kind);
  input.setHighlightedField(target.field);
  input.timerRef.current = window.setTimeout(() => {
    input.setHighlightedArea(null);
    input.setHighlightedField(null);
  }, highlightDurationMs);
}

function readFallbackElement(
  kind: PublishPreflightIssueTargetKind,
  refs: {
    chromeSettingsRef: MutableRefObject<HTMLDivElement | null>;
    pageContentRef: MutableRefObject<HTMLDivElement | null>;
    previewRef: MutableRefObject<HTMLDivElement | null>;
    sectionPropertiesRef: MutableRefObject<HTMLDivElement | null>;
    seoSettingsRef: MutableRefObject<HTMLDivElement | null>;
  },
): HTMLElement | null {
  if (kind === "section") {
    return refs.sectionPropertiesRef.current;
  }

  if (kind === "seo") {
    return refs.seoSettingsRef.current;
  }

  if (kind === "chrome") {
    return refs.chromeSettingsRef.current;
  }

  if (kind === "media") {
    return refs.previewRef.current;
  }

  return refs.pageContentRef.current;
}

function scrollToPublishField(
  field: string,
  fallbackElement: HTMLElement | null,
): void {
  const scroll = () => {
    const fieldElement = document.getElementById(
      readPublishPreflightFieldDomId(field),
    );

    scrollToEditorArea(fieldElement ?? fallbackElement);
  };

  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => requestAnimationFrame(scroll));
    return;
  }

  window.setTimeout(scroll, 0);
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

  element.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}
