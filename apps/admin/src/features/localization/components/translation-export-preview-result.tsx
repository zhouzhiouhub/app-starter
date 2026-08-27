import { Descriptions, Typography } from "antd";
import type { TranslationExportPreviewResult } from "../types";

export function TranslationExportPreviewResultView(props: {
  preview: TranslationExportPreviewResult;
}) {
  return (
    <Descriptions bordered column={{ md: 2, xs: 1 }} size="small">
      <Descriptions.Item label="Locale">
        <Typography.Text code>{props.preview.locale}</Typography.Text>
      </Descriptions.Item>
      <Descriptions.Item label="Exportable">
        {props.preview.exportableEntryCount}
      </Descriptions.Item>
      <Descriptions.Item label="Page keys">
        {props.preview.expectedKeyCount}
      </Descriptions.Item>
      <Descriptions.Item label="Missing">
        {props.preview.missingKeyCount}
      </Descriptions.Item>
      <Descriptions.Item label="Sample keys" span={2}>
        <Typography.Text code>
          {props.preview.sampleKeys.join(", ") || "none"}
        </Typography.Text>
      </Descriptions.Item>
    </Descriptions>
  );
}
