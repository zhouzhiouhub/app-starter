import { Alert, Descriptions, Space, Tag, Typography } from "antd";
import { useMemo } from "react";
import { translationBulkPreviewMaxEntries } from "@app-starter/schema";
import {
  readTranslationImportTemplateEmptyStateMessage,
  readTranslationImportTemplateSeverity,
  summarizeTranslationImportTemplate,
} from "../translation-import-template-summary";

export function TranslationImportTemplateGuide(props: {
  defaultLocale: string;
  importText: string;
  missingKeys?: string[];
}) {
  const summary = useMemo(
    () =>
      summarizeTranslationImportTemplate({
        defaultLocale: props.defaultLocale,
        importText: props.importText,
        missingKeys: props.missingKeys,
      }),
    [props.defaultLocale, props.importText, props.missingKeys],
  );
  const severity = readTranslationImportTemplateSeverity(summary);
  const emptyStateMessage = readTranslationImportTemplateEmptyStateMessage({
    defaultLocale: props.defaultLocale,
    summary,
  });

  return (
    <Space direction="vertical" size={8} style={{ width: "100%" }}>
      <Space size={8} wrap>
        <Tag color={readSeverityColor(severity)}>
          {readSeverityLabel(summary)}
        </Tag>
        <Typography.Text type="secondary">
          entries[] supports key, value, context, and locale. Empty locale uses{" "}
          <Typography.Text code>{props.defaultLocale}</Typography.Text>.
        </Typography.Text>
      </Space>
      {summary.nonDefaultLocaleCount > 0 ? (
        <Alert
          description={`${summary.nonDefaultLocaleCount} row(s) target a non-default Locale. MVP import keeps MULTI_LOCALE_ENABLED=false, so those rows will return MULTI_LOCALE_DISABLED.`}
          message="Non-default Locale rows are blocked"
          showIcon
          type="warning"
        />
      ) : null}
      {emptyStateMessage ? (
        <Alert
          description={emptyStateMessage}
          message="Import draft is empty"
          showIcon
          type="info"
        />
      ) : null}
      <Descriptions bordered column={{ md: 4, xs: 1 }} size="small">
        <Descriptions.Item label="Rows">{summary.entryCount}</Descriptions.Item>
        <Descriptions.Item label="Missing draft">
          {summary.coveredMissingKeyCount}/
          {summary.coveredMissingKeyCount + summary.remainingMissingKeyCount}
        </Descriptions.Item>
        <Descriptions.Item label="Blank values">
          {summary.blankValueCount}
        </Descriptions.Item>
        <Descriptions.Item label="Local blockers">
          {readLocalBlockerCount(summary)}
        </Descriptions.Item>
        <Descriptions.Item label="Duplicates">
          {summary.duplicateKeyCount}
        </Descriptions.Item>
        <Descriptions.Item label="Invalid keys">
          {summary.invalidKeyCount}
        </Descriptions.Item>
        <Descriptions.Item label="Non-default Locale">
          {summary.nonDefaultLocaleCount}
        </Descriptions.Item>
        <Descriptions.Item label="Limit">
          {summary.overLimitCount > 0
            ? `${summary.overLimitCount} over ${translationBulkPreviewMaxEntries}`
            : translationBulkPreviewMaxEntries}
        </Descriptions.Item>
      </Descriptions>
    </Space>
  );
}

function readSeverityLabel(
  summary: ReturnType<typeof summarizeTranslationImportTemplate>,
): string {
  if (summary.invalidJson) {
    return "Invalid JSON";
  }

  if (summary.invalidEnvelope) {
    return "Invalid template";
  }

  if (readLocalBlockerCount(summary) > 0) {
    return "Needs review";
  }

  if (summary.entryCount > 0) {
    return "Ready to preview";
  }

  return "Empty template";
}

function readLocalBlockerCount(
  summary: ReturnType<typeof summarizeTranslationImportTemplate>,
): number {
  return (
    summary.blankValueCount +
    summary.duplicateKeyCount +
    summary.invalidKeyCount +
    summary.malformedEntryCount +
    summary.nonDefaultLocaleCount +
    summary.overLimitCount
  );
}

function readSeverityColor(
  severity: ReturnType<typeof readTranslationImportTemplateSeverity>,
): string {
  if (severity === "success") {
    return "green";
  }

  if (severity === "warning") {
    return "orange";
  }

  if (severity === "error") {
    return "red";
  }

  return "blue";
}
