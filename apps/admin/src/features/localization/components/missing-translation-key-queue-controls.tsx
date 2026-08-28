import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import { Button, Space, Tooltip, Typography } from "antd";
import type { MissingTranslationKeyQueueState } from "../missing-translation-key-queue";
import { formatMissingTranslationKeyQueueNavigationHint } from "../translation-key-action-hints";

export function MissingTranslationKeyQueueControls(props: {
  isSelectingKey?: boolean;
  locale: string;
  onSelectKey: (key: string | null) => void;
  queue: MissingTranslationKeyQueueState;
  selectedKey?: string;
}) {
  if (!props.queue.currentKey) {
    return null;
  }

  return (
    <Space size={6} wrap>
      <Typography.Text type="secondary">
        Queue{" "}
        {props.queue.currentIndex >= 0
          ? `${props.queue.currentIndex + 1}/${props.queue.totalCount}`
          : `0/${props.queue.totalCount}`}
      </Typography.Text>
      <Tooltip
        title={formatMissingTranslationKeyQueueNavigationHint({
          action: "start",
          key: props.queue.currentKey,
          locale: props.locale,
        })}
      >
        <Button
          disabled={props.isSelectingKey}
          icon={<PlayCircleOutlined />}
          onClick={() => props.onSelectKey(props.queue.currentKey)}
          size="small"
        >
          {props.selectedKey === props.queue.currentKey ? "Current" : "Start"}
        </Button>
      </Tooltip>
      <Tooltip
        title={
          props.queue.previousKey
            ? formatMissingTranslationKeyQueueNavigationHint({
                action: "previous",
                key: props.queue.previousKey,
                locale: props.locale,
              })
            : undefined
        }
      >
        <Button
          disabled={props.isSelectingKey || !props.queue.previousKey}
          icon={<ArrowLeftOutlined />}
          onClick={() => props.onSelectKey(props.queue.previousKey)}
          size="small"
        >
          Previous
        </Button>
      </Tooltip>
      <Tooltip
        title={
          props.queue.nextKey
            ? formatMissingTranslationKeyQueueNavigationHint({
                action: "next",
                key: props.queue.nextKey,
                locale: props.locale,
              })
            : undefined
        }
      >
        <Button
          disabled={props.isSelectingKey || !props.queue.nextKey}
          icon={<ArrowRightOutlined />}
          onClick={() => props.onSelectKey(props.queue.nextKey)}
          size="small"
        >
          Next
        </Button>
      </Tooltip>
    </Space>
  );
}
