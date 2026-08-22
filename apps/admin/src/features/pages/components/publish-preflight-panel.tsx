import { Alert, List, Space, Tag, Typography } from "antd";
import {
  summarizePublishPreflightIssues,
  type PublishPreflightIssue,
} from "../publish-preflight";

export function PublishPreflightPanel(props: {
  issues: PublishPreflightIssue[];
}) {
  if (props.issues.length === 0) {
    return null;
  }

  const summary = summarizePublishPreflightIssues(props.issues);

  return (
    <Alert
      description={
        <List
          dataSource={props.issues}
          renderItem={(issue, index) => (
            <List.Item key={`${issue.field}-${index}`}>
              <Space align="start" size={8}>
                <Tag color={issue.severity === "error" ? "red" : "gold"}>
                  {issue.severity}
                </Tag>
                <span>
                  <Typography.Text strong>{issue.field}</Typography.Text>
                  <Typography.Text>: {issue.message}</Typography.Text>
                </span>
              </Space>
            </List.Item>
          )}
          size="small"
          split={false}
        />
      }
      message={summary.message}
      showIcon
      style={{ marginBottom: 16 }}
      type={summary.status === "blocked" ? "error" : "warning"}
    />
  );
}
