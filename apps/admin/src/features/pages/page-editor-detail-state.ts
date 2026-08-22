import { createFallbackPage, type PageSchema } from "@app-starter/schema";
import { createSchemaFingerprint } from "./schema-fingerprint.ts";
import type {
  PageDetail,
  PageSummary,
  PageVersionSummary,
} from "./types";

export interface PageEditorSavedState {
  page: PageSummary;
  savedDraftFingerprint: string | null;
  versions: PageVersionSummary[];
}

export interface PageEditorDraftState extends PageEditorSavedState {
  schema: PageSchema;
}

export function readPageEditorDraftState(
  detail: PageDetail,
): PageEditorDraftState {
  const schema =
    detail.draftSchema ??
    createFallbackPage({
      slug: detail.slug,
      title: detail.title,
    });

  return {
    page: detail,
    savedDraftFingerprint: createSchemaFingerprint(schema),
    schema,
    versions: detail.versions,
  };
}

export function readPageEditorSavedState(
  detail: PageDetail,
  schema: PageSchema,
): PageEditorSavedState {
  return {
    page: detail,
    savedDraftFingerprint: createSchemaFingerprint(schema),
    versions: detail.versions,
  };
}
