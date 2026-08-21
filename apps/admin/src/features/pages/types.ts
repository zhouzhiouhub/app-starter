import type {
  ApiResponseMeta,
  PageSchema,
  PageTemplateId,
} from "@app-starter/schema";

export interface PageSummary {
  createdAt: string;
  id: string;
  publishedVersionId: string | null;
  siteId: string;
  slug: string;
  status: string;
  title: string;
  type: string;
  updatedAt: string;
}

export interface PageVersionSummary {
  authorEmail: string | null;
  authorId: string;
  authorName: string | null;
  createdAt: string;
  id: string;
  publishedAt: string | null;
  status: string;
  version: number;
}

export interface PageDetail extends PageSummary {
  draftSchema: PageSchema | null;
  publishedSchema: PageSchema | null;
  versions: PageVersionSummary[];
}

export interface PageMutationResult {
  meta: ApiResponseMeta | null;
  schema: PageSchema;
}

export interface PageListMeta {
  limit: number;
  page: number;
  total: number;
}

export interface CreatePageInput {
  slug: string;
  templateId?: PageTemplateId;
  title?: string;
}

export interface EditorFeedback {
  message: string;
  type: "success" | "warning" | "error";
}

export interface PagePreviewToken {
  expiresAt: string;
  slug: string;
  token: string;
}
