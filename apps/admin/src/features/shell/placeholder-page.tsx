import { Alert, Typography } from "antd";

export function PlaceholderPage(props: {
  description: string;
  title: string;
}) {
  return (
    <div>
      <Typography.Title level={3}>{props.title}</Typography.Title>
      <Typography.Paragraph>{props.description}</Typography.Paragraph>
      <Alert
        message="This module is reserved for a later Phase 1 slice."
        showIcon
        type="info"
      />
    </div>
  );
}
