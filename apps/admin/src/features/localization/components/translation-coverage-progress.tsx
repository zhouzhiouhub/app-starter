import { Progress, Space, Typography } from "antd";

export function TranslationCoverageProgress(props: {
  expectedKeyCount: number;
  missingKeyCount: number;
  percent: number;
  resolvedKeyCount: number;
}) {
  return (
    <Space direction="vertical" size={4} style={{ width: "100%" }}>
      <Progress
        percent={props.percent}
        size="small"
        status={props.missingKeyCount > 0 ? "normal" : "success"}
      />
      <Typography.Text type="secondary">
        {props.resolvedKeyCount} / {props.expectedKeyCount}
      </Typography.Text>
    </Space>
  );
}
