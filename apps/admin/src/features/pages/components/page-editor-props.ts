import type {
  MediaAssetReference,
  PageSchema,
  Viewport,
} from "@app-starter/schema";
import type { MediaResolverFeedback } from "../../media/media-resolver-feedback";
import type { MediaResolverState } from "../../media/hooks/use-media-resolver";
import type {
  EditorFeedback,
  PageSummary,
  PageVersionListMeta,
  PageVersionSummary,
} from "../types";

export interface PageEditorProps {
  canRedo: boolean;
  canUndo: boolean;
  feedback: EditorFeedback | null;
  isCreatingPreview: boolean;
  isDraftDirty: boolean;
  isPublishing: boolean;
  isSaving: boolean;
  isVersionHistoryLoading: boolean;
  mediaFeedback: MediaResolverFeedback | null;
  mediaReferences: MediaAssetReference[];
  mediaResolver: MediaResolverState;
  onFeedbackClose: () => void;
  onOpenPreview: () => void;
  onPublish: () => void;
  onRedo: () => void;
  onRollbackVersion: (versionId: string) => void | Promise<void>;
  onSaveDraft: () => void;
  onSchemaChange: (schema: PageSchema) => void;
  onUndo: () => void;
  onVersionHistoryPageChange: (page: number) => void | Promise<void>;
  onViewportChange: (viewport: Viewport) => void;
  page: PageSummary;
  rollingBackVersionId: string | null;
  schema: PageSchema;
  versionHistoryError: string | null;
  versionHistoryMeta: PageVersionListMeta;
  versions: PageVersionSummary[];
  viewport: Viewport;
}
