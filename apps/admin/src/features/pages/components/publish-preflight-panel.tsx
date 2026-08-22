import { AimOutlined, CheckOutlined } from "@ant-design/icons";
import { Alert, Button, List, Space, Tag, Typography } from "antd";
import {
  summarizePublishPreflightIssues,
  type PublishPreflightIssue,
} from "../publish-preflight";
import type { PublishPreflightIssueTarget } from "../publish-preflight-target";

export function PublishPreflightPanel(props: {
  issues: PublishPreflightIssue[];
  onIssueFix?: (issue: PublishPreflightIssue) => void;
  onTargetSelect?: (target: PublishPreflightIssueTarget) => void;
  readIssueFixLabel?: (issue: PublishPreflightIssue) => string | null;
  readIssueTarget?: (
    issue: PublishPreflightIssue,
  ) => PublishPreflightIssueTarget | null;
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
          renderItem={(issue, index) => {
            const fixLabel = props.readIssueFixLabel?.(issue) ?? null;
            const target = props.readIssueTarget?.(issue) ?? null;

            return (
              <List.Item key={`${issue.field}-${index}`}>
                <Space align="start" size={8}>
                  <Tag color={issue.severity === "error" ? "red" : "gold"}>
                    {issue.severity}
                  </Tag>
                  <span>
                    <Typography.Text strong>{issue.field}</Typography.Text>
                    <Typography.Text>: {issue.message}</Typography.Text>
                  </span>
                  {target && props.onTargetSelect ? (
                    <Button
                      aria-label={`Focus ${target.label}`}
                      icon={<AimOutlined />}
                      onClick={() => props.onTargetSelect?.(target)}
                      size="small"
                      type="link"
                    >
                      Focus
                    </Button>
                  ) : null}
                  {fixLabel && props.onIssueFix ? (
                    <Button
                      aria-label={fixLabel}
                      icon={<CheckOutlined />}
                      onClick={() => props.onIssueFix?.(issue)}
                      size="small"
                      type="link"
                    >
                      Fix
                    </Button>
                  ) : null}
                </Space>
              </List.Item>
            );
          }}
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
