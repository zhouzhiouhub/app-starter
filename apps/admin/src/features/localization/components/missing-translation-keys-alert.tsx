import {
  EditOutlined,
  FilterOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { Alert, Button, Pagination, Space, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import {
  formatMissingTranslationKeyEmptyActionMessage,
  formatMissingTranslationKeyFilterRestoreMessage,
  formatMissingTranslationKeyFilterScopeMessage,
  hasMissingTranslationKeyFilters,
} from "../missing-translation-key-filter-scope";
import {
  readBrowserMissingTranslationKeyPage,
  readMissingTranslationKeyPageForKey,
  readMissingTranslationKeyPaginationState,
  writeBrowserMissingTranslationKeyPage,
} from "../missing-translation-key-pagination";
import { readMissingTranslationKeyQueueState } from "../missing-translation-key-queue";
import { groupMissingTranslationKeys } from "../missing-translation-key-groups";
import type { LocalizationTranslationsMeta } from "../types";
import { MissingTranslationKeyQueueControls } from "./missing-translation-key-queue-controls";

const missingTranslationKeyPageSize = 10;

export function MissingTranslationKeysAlert(props: {
  isRefreshing?: boolean;
  isSelectingKey?: boolean;
  meta: LocalizationTranslationsMeta;
  onClearFilters?: () => void;
  onRefreshMissingKeys?: () => Promise<void> | void;
  onSelectKey?: (key: string) => void;
  resolvedKeys?: string[];
  selectedKey?: string;
}) {
  const [visiblePage, setVisiblePage] = useState(
    readBrowserMissingTranslationKeyPage,
  );
  const queue = readMissingTranslationKeyQueueState(
    props.meta.missingKeys,
    props.selectedKey,
    props.resolvedKeys,
  );
  const queueFingerprint = queue.keys.join("\n");
  const filterScopeMessage = formatMissingTranslationKeyFilterScopeMessage({
    namespace: props.meta.namespace,
    query: props.meta.query,
  });
  const hasActiveFilters = hasMissingTranslationKeyFilters({
    namespace: props.meta.namespace,
    query: props.meta.query,
  });
  const emptyActionMessage = formatMissingTranslationKeyEmptyActionMessage({
    namespace: props.meta.namespace,
    query: props.meta.query,
  });
  const filterRestoreMessage = formatMissingTranslationKeyFilterRestoreMessage({
    missingKeys: props.meta.missingKeys,
    namespace: props.meta.namespace,
    query: props.meta.query,
    resolvedKeys: props.resolvedKeys,
    selectedKey: props.selectedKey,
  });
  const pageState = readMissingTranslationKeyPaginationState({
    currentPage: visiblePage,
    keys: queue.keys,
    pageSize: missingTranslationKeyPageSize,
  });
  const groups = groupMissingTranslationKeys(pageState.keys);
  const isVisibleQueueComplete = queue.totalCount === 0;
  const canClearFilters = hasActiveFilters && Boolean(props.onClearFilters);
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

  useEffect(() => {
    writeBrowserMissingTranslationKeyPage(pageState.currentPage);
  }, [pageState.currentPage]);

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
          {props.onSelectKey ? (
            <MissingTranslationKeyQueueControls
              isSelectingKey={props.isSelectingKey}
              onSelectKey={selectQueuedKey}
              queue={queue}
              selectedKey={props.selectedKey}
            />
          ) : null}
          {isVisibleQueueComplete ? (
            <Space size={8} wrap>
              <Typography.Text type="secondary">
                {emptyActionMessage}
              </Typography.Text>
              {canClearFilters ? (
                <Button
                  icon={<FilterOutlined />}
                  loading={props.isSelectingKey}
                  onClick={() => props.onClearFilters?.()}
                  size="small"
                >
                  Clear filters
                </Button>
              ) : null}
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
          {filterScopeMessage ? (
            <Typography.Text type="secondary">
              {filterScopeMessage}
            </Typography.Text>
          ) : null}
          {filterRestoreMessage ? (
            <Space size={8} wrap>
              <Typography.Text type="warning">
                {filterRestoreMessage}
              </Typography.Text>
              {canClearFilters ? (
                <Button
                  icon={<FilterOutlined />}
                  loading={props.isSelectingKey}
                  onClick={() => props.onClearFilters?.()}
                  size="small"
                >
                  Clear filters
                </Button>
              ) : null}
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
