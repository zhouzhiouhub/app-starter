import { Space, Typography } from "antd";
import type { TranslationImportPreviewResult } from "../types";
import { TranslationImportPreviewResultView } from "./translation-import-preview-result";

export function TranslationImportErrorDetailsView(props: {
  details: TranslationImportPreviewResult;
}) {
  return (
    <Space direction="vertical" size={8} style={{ width: "100%" }}>
      <Typography.Text strong>Import error details</Typography.Text>
      <TranslationImportPreviewResultView preview={props.details} />
    </Space>
  );
}
