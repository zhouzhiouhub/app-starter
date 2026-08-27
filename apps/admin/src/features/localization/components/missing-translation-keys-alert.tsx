import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  EditOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import { Alert, Button, Space, Tag, Typography } from "antd";
import { readMissingTranslationKeyQueueState } from "../missing-translation-key-queue";
import { groupMissingTranslationKeys } from "../missing-translation-key-groups";
import type { LocalizationTranslationsMeta } from "../types";

export function MissingTranslationKeysAlert(props: {
  isSelectingKey?: boolean;
  meta: LocalizationTranslationsMeta;
  onSelectKey?: (key: string) => void;
  resolvedKeys?: string[];
  selectedKey?: string;
}) {
  if (props.meta.missingKeyCount === 0) {
    return null;
  }

  const groups = groupMissingTranslationKeys(props.meta.missingKeys);
  const queue = readMissingTranslationKeyQueueState(
    props.meta.missingKeys,
    props.selectedKey,
    props.resolvedKeys,
  );
  const suffix =
    props.meta.missingKeyCount > props.meta.missingKeyPreviewLimit
      ? ` Showing first ${props.meta.missingKeyPreviewLimit}.`
      : "";

  function selectQueuedKey(key: string | null) {
    if (key) {
      props.onSelectKey?.(key);
    }
  }

  return (
    <Alert
      description={
        <Space direction="vertical" size={6}>
          {props.onSelectKey && queue.currentKey ? (
            <Space size={6} wrap>
              <Typography.Text type="secondary">
                Queue{" "}
                {queue.currentIndex >= 0
                  ? `${queue.currentIndex + 1}/${queue.totalCount}`
                  : `0/${queue.totalCount}`}
              </Typography.Text>
              <Button
                disabled={props.isSelectingKey}
                icon={<PlayCircleOutlined />}
                onClick={() => selectQueuedKey(queue.currentKey)}
                size="small"
              >
                {props.selectedKey === queue.currentKey ? "Current" : "Start"}
              </Button>
              <Button
                disabled={props.isSelectingKey || !queue.previousKey}
                icon={<ArrowLeftOutlined />}
                onClick={() => selectQueuedKey(queue.previousKey)}
                size="small"
              >
                Previous
              </Button>
              <Button
                disabled={props.isSelectingKey || !queue.nextKey}
                icon={<ArrowRightOutlined />}
                onClick={() => selectQueuedKey(queue.nextKey)}
                size="small"
              >
                Next
              </Button>
            </Space>
          ) : null}
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
                        disabled={
                          props.isSelectingKey && props.selectedKey !== key
                        }
                        icon={<EditOutlined />}
                        loading={
                          props.isSelectingKey && props.selectedKey === key
                        }
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
