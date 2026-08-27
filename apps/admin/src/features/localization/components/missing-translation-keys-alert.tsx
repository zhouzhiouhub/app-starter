import { EditOutlined } from "@ant-design/icons";
import { Alert, Button, Space, Tag, Typography } from "antd";
import { groupMissingTranslationKeys } from "../missing-translation-key-groups";
import type { LocalizationTranslationsMeta } from "../types";

export function MissingTranslationKeysAlert(props: {
  meta: LocalizationTranslationsMeta;
  onSelectKey?: (key: string) => void;
}) {
  if (props.meta.missingKeyCount === 0) {
    return null;
  }

  const groups = groupMissingTranslationKeys(props.meta.missingKeys);
  const suffix =
    props.meta.missingKeyCount > props.meta.missingKeyPreviewLimit
      ? ` Showing first ${props.meta.missingKeyPreviewLimit}.`
      : "";

  return (
    <Alert
      description={
        <Space direction="vertical" size={6}>
          {groups.map((group) => (
            <Space align="start" key={group.namespace} size={8}>
              <Tag>{group.namespace}</Tag>
              <Space direction="vertical" size={4}>
                {group.keys.map((key) => (
                  <Space key={key} size={6} wrap>
                    <Typography.Text code style={{ wordBreak: "break-word" }}>
                      {key}
                    </Typography.Text>
                    {props.onSelectKey ? (
                      <Button
                        icon={<EditOutlined />}
                        onClick={() => props.onSelectKey?.(key)}
                        size="small"
                      >
                        Fill
                      </Button>
                    ) : null}
                  </Space>
                ))}
              </Space>
            </Space>
          ))}
          {suffix ? (
            <Typography.Text type="secondary">{suffix}</Typography.Text>
          ) : null}
        </Space>
      }
      message={`${props.meta.missingKeyCount} page translation keys are missing default ${props.meta.locale} entries.`}
      showIcon
      type="warning"
    />
  );
}
