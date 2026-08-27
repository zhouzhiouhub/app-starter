import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import { Button, Space, Typography } from "antd";
import type { MissingTranslationKeyQueueState } from "../missing-translation-key-queue";

export function MissingTranslationKeyQueueControls(props: {
  isSelectingKey?: boolean;
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
      <Button
        disabled={props.isSelectingKey}
        icon={<PlayCircleOutlined />}
        onClick={() => props.onSelectKey(props.queue.currentKey)}
        size="small"
      >
        {props.selectedKey === props.queue.currentKey ? "Current" : "Start"}
      </Button>
      <Button
        disabled={props.isSelectingKey || !props.queue.previousKey}
        icon={<ArrowLeftOutlined />}
        onClick={() => props.onSelectKey(props.queue.previousKey)}
        size="small"
      >
        Previous
      </Button>
      <Button
        disabled={props.isSelectingKey || !props.queue.nextKey}
        icon={<ArrowRightOutlined />}
        onClick={() => props.onSelectKey(props.queue.nextKey)}
        size="small"
      >
        Next
      </Button>
    </Space>
  );
}
