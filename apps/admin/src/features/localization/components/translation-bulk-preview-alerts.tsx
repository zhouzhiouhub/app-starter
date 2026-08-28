import { DeleteOutlined, SearchOutlined } from "@ant-design/icons";
import { Alert, Button, Popconfirm } from "antd";
import type { TranslationBulkRepairNotice } from "../hooks/use-translation-bulk-repair-confirmation";
import type { TranslationImportHistoryFilterAlignment } from "../translation-import-history-alignment";
import type { TranslationImportReviewNotice } from "../translation-import-review";

export function TranslationBulkPreviewAlerts(props: {
  draftClearSuggestion?: string | null;
  draftNotice?: string | null;
  error?: string | null;
  historyFilterAlignment?: TranslationImportHistoryFilterAlignment | null;
  historyReplayCleanupSuggestion?: string | null;
  historyReplayNotice?: string | null;
  importReviewNotice?: TranslationImportReviewNotice | null;
  onAlignHistoryFilters?: (key: string) => Promise<void> | void;
  onClearHistoryReplay: () => void;
  onClearImportDraftAfterSuccess: () => void;
  onClearImportResultHistory: () => void;
  previewRepairDraftNotice?: string | null;
  repairCleanupSuggestion?: string | null;
  repairCompletionNotice?: string | null;
  repairHistoryRetentionMessage?: string | null;
  repairServerNotice?: TranslationBulkRepairNotice | null;
}) {
  return (
    <>
      {props.error ? (
        <Alert message={props.error} showIcon type="error" />
      ) : null}
      {props.draftNotice ? (
        <Alert message={props.draftNotice} showIcon type="info" />
      ) : null}
      {props.previewRepairDraftNotice ? (
        <Alert message={props.previewRepairDraftNotice} showIcon type="info" />
      ) : null}
      {props.historyReplayNotice ? (
        <Alert
          action={
            props.historyReplayCleanupSuggestion ? (
              <Popconfirm
                cancelText="Keep replay"
                okText="Clear"
                onConfirm={props.onClearHistoryReplay}
                title="Clear replay and recent import history?"
              >
                <Button icon={<DeleteOutlined />} size="small">
                  Clear replay
                </Button>
              </Popconfirm>
            ) : undefined
          }
          description={props.historyReplayCleanupSuggestion}
          message={props.historyReplayNotice}
          showIcon
          type="info"
        />
      ) : null}
      {props.historyFilterAlignment ? (
        <Alert
          action={
            props.onAlignHistoryFilters ? (
              <Button
                icon={<SearchOutlined />}
                onClick={() =>
                  props.historyFilterAlignment
                    ? void props.onAlignHistoryFilters?.(
                        props.historyFilterAlignment.focusKey,
                      )
                    : undefined
                }
                size="small"
              >
                Align filters
              </Button>
            ) : undefined
          }
          message={props.historyFilterAlignment.message}
          showIcon
          type="warning"
        />
      ) : null}
      {props.importReviewNotice ? (
        <Alert
          message={props.importReviewNotice.message}
          showIcon
          type={props.importReviewNotice.type}
        />
      ) : null}
      {props.repairCompletionNotice ? (
        <Alert
          description={props.repairHistoryRetentionMessage}
          message={props.repairCompletionNotice}
          showIcon
          type="success"
        />
      ) : null}
      {props.repairServerNotice ? (
        <Alert
          action={
            props.repairCleanupSuggestion ? (
              <Button
                icon={<DeleteOutlined />}
                onClick={props.onClearImportResultHistory}
                size="small"
              >
                Clear history
              </Button>
            ) : undefined
          }
          description={props.repairCleanupSuggestion}
          message={props.repairServerNotice.message}
          showIcon
          type={props.repairServerNotice.type}
        />
      ) : null}
      {props.draftClearSuggestion ? (
        <Alert
          action={
            <Button
              icon={<DeleteOutlined />}
              onClick={props.onClearImportDraftAfterSuccess}
              size="small"
            >
              Clear draft
            </Button>
          }
          message={props.draftClearSuggestion}
          showIcon
          type="success"
        />
      ) : null}
    </>
  );
}
