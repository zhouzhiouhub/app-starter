import { Alert, Descriptions, Space, Tag, Typography } from "antd";
import type { readLocalizationSummaryState } from "../localization-summary-state";
import { TranslationCoverageProgress } from "./translation-coverage-progress";

export function LocalizationOverview(props: {
  state: ReturnType<typeof readLocalizationSummaryState>;
}) {
  return (
    <>
      <Alert
        description="Non-default Locale creation and publishing return MULTI_LOCALE_DISABLED while the MVP flag is off."
        message="Multi-locale writes disabled"
        showIcon
        type="info"
      />
      <Descriptions bordered column={{ md: 2, xs: 1 }} size="small">
        <Descriptions.Item label="Default market">
          <Typography.Text code>{props.state.defaultMarket}</Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="Currency">
          {props.state.marketCurrency}
        </Descriptions.Item>
        <Descriptions.Item label="Default locale">
          <Typography.Text code>{props.state.defaultLocale}</Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="Fallback locale">
          <Typography.Text code>{props.state.fallbackLocale}</Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="Translation fallback">
          <Tag color={props.state.isFallback ? "orange" : "green"}>
            {props.state.isFallback ? "fallback" : "default"}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Translation entries">
          <Space size={4}>
            <span>{props.state.translationTotal}</span>
            <Typography.Text type="secondary">
              / {props.state.translationEntryLimit}
            </Typography.Text>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="Page keys missing">
          <Tag color={props.state.missingKeyCount > 0 ? "orange" : "green"}>
            {props.state.missingKeyCount}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Page key coverage">
          <TranslationCoverageProgress
            expectedKeyCount={props.state.translationExpectedKeyCount}
            missingKeyCount={props.state.missingKeyCount}
            percent={props.state.translationCoveragePercent}
            resolvedKeyCount={props.state.translationResolvedKeyCount}
          />
        </Descriptions.Item>
        <Descriptions.Item label="Fallback probe">
          <Space size={4}>
            <Typography.Text code>
              {props.state.translationRequestedLocale}
            </Typography.Text>
            <Typography.Text type="secondary">-&gt;</Typography.Text>
            <Typography.Text code>
              {props.state.translationResolvedLocale}
            </Typography.Text>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="MVP state">
          <Tag color={readStateTagColor(props.state.status)}>
            {props.state.status}
          </Tag>
        </Descriptions.Item>
      </Descriptions>
    </>
  );
}

function readStateTagColor(
  status: ReturnType<typeof readLocalizationSummaryState>["status"],
): string {
  return status === "active"
    ? "green"
    : status === "fallback"
      ? "orange"
      : "red";
}
