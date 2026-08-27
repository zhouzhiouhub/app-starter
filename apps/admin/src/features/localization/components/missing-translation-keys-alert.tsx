import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  EditOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { Alert, Button, Pagination, Space, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import {
  readMissingTranslationKeyPageForKey,
  readMissingTranslationKeyPaginationState,
} from "../missing-translation-key-pagination";
import { readMissingTranslationKeyQueueState } from "../missing-translation-key-queue";
import { groupMissingTranslationKeys } from "../missing-translation-key-groups";
import type { LocalizationTranslationsMeta } from "../types";

const missingTranslationKeyPageSize = 10;

export function MissingTranslationKeysAlert(props: {
  isRefreshing?: boolean;
  isSelectingKey?: boolean;
  meta: LocalizationTranslationsMeta;
  onRefreshMissingKeys?: () => Promise<void> | void;
  onSelectKey?: (key: string) => void;
  resolvedKeys?: string[];
  selectedKey?: string;
}) {
  const [visiblePage, setVisiblePage] = useState(1);
  const queue = readMissingTranslationKeyQueueState(
    props.meta.missingKeys,
    props.selectedKey,
    props.resolvedKeys,
  );
  const queueFingerprint = queue.keys.join("\n");
  const pageState = readMissingTranslationKeyPaginationState({
    currentPage: visiblePage,
    keys: queue.keys,
    pageSize: missingTranslationKeyPageSize,
  });
  const groups = groupMissingTranslationKeys(pageState.keys);
  const isVisibleQueueComplete = queue.totalCount === 0;
  const suffix =
    props.meta.missingKeyCount > props.meta.missingKeyPreviewLimit
      ? ` Showing first ${props.meta.missingKeyPreviewLimit}.`
      : "";

  useEffect(() => {
    const selectedPage = readMissingTranslationKeyPageForKey({
      key: props.selectedKey,
      keys: queue.keys,
      pageSize: missingTranslationKeyPageSize,
    });

    setVisiblePage(
      (current) =>
        selectedPage ??
        readMissingTranslationKeyPaginationState({
          currentPage: current,
          keys: queue.keys,
          pageSize: missingTranslationKeyPageSize,
        }).currentPage,
    );
  }, [props.selectedKey, queueFingerprint]);

  if (props.meta.missingKeyCount === 0) {
    return null;
  }

  function selectQueuedKey(key: string | null) {
    if (key) {
      setVisiblePage(
        readMissingTranslationKeyPageForKey({
          key,
          keys: queue.keys,
          pageSize: missingTranslationKeyPageSize,
        }) ?? visiblePage,
      );
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
          {isVisibleQueueComplete ? (
            <Space size={8} wrap>
              <Typography.Text type="secondary">
                Visible missing key queue is complete. Refresh missing keys to
                confirm server coverage.
              </Typography.Text>
              {props.onRefreshMissingKeys ? (
                <Button
                  icon={<ReloadOutlined />}
                  loading={props.isRefreshing}
                  onClick={() => void props.onRefreshMissingKeys?.()}
                  size="small"
                >
                  Refresh missing keys
                </Button>
              ) : null}
            </Space>
          ) : null}
          {!isVisibleQueueComplete ? (
            <Typography.Text type="secondary">
              Showing {pageState.startIndex}-{pageState.endIndex} of{" "}
              {pageState.totalCount} visible missing keys.
            </Typography.Text>
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
          {pageState.totalPages > 1 ? (
            <Pagination
              current={pageState.currentPage}
              onChange={setVisiblePage}
              pageSize={pageState.pageSize}
              showSizeChanger={false}
              size="small"
              total={pageState.totalCount}
            />
          ) : null}
        </Space>
      }
      message={
        isVisibleQueueComplete
          ? `Visible missing key queue is complete for default ${props.meta.locale}.`
          : `${props.meta.missingKeyCount} page translation keys are missing default ${props.meta.locale} entries.`
      }
      showIcon
      type={isVisibleQueueComplete ? "success" : "warning"}
    />
  );
}
