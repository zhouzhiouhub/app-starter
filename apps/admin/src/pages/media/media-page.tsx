import { Alert, Modal, Segmented, Select, Space, Typography } from "antd";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { archiveMediaAsset } from "../../features/media/api";
import { MediaListTable } from "../../features/media/components/media-list-table";
import { RegisterMediaModal } from "../../features/media/components/register-media-modal";
import { useMediaList } from "../../features/media/hooks/use-media-list";
import {
  buildMediaListSearch,
  readMediaListPage,
  readMediaListStatus,
  readMediaListType,
} from "../../features/media/media-list-query";
import { readMediaListPageAfterArchive } from "../../features/media/media-list-page-state";
import { mediaTypeFilterOptions } from "../../features/media/constants";
import type {
  MediaAsset,
  MediaAssetListStatus,
  MediaAssetType,
} from "../../features/media/types";
import { formatRequestError } from "../../lib/api-error";

export function MediaPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = useMemo(
    () => readMediaListStatus(searchParams),
    [searchParams],
  );
  const type = useMemo(() => readMediaListType(searchParams), [searchParams]);
  const page = useMemo(() => readMediaListPage(searchParams), [searchParams]);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const { assets, error, isLoading, load, meta } = useMediaList(
    status,
    page,
    type,
  );
  const setStatus = useCallback(
    (nextStatus: MediaAssetListStatus) => {
      setSearchParams(buildMediaListSearch({ status: nextStatus, type }), {
        replace: true,
      });
    },
    [setSearchParams, type],
  );
  const setType = useCallback(
    (nextType: MediaAssetType | null) => {
      setSearchParams(buildMediaListSearch({ status, type: nextType }), {
        replace: true,
      });
    },
    [setSearchParams, status],
  );
  const setPage = useCallback(
    (nextPage: number) => {
      setSearchParams(buildMediaListSearch({ page: nextPage, status, type }), {
        replace: true,
      });
    },
    [setSearchParams, status, type],
  );

  function confirmArchive(asset: MediaAsset) {
    Modal.confirm({
      cancelText: "Cancel",
      okButtonProps: { danger: true },
      okText: "Archive",
      onOk: () => archiveAsset(asset.id),
      title: `Archive ${asset.filename}?`,
    });
  }

  async function archiveAsset(assetId: string) {
    setArchivingId(assetId);
    setArchiveError(null);

    try {
      await archiveMediaAsset(assetId);
      const nextPage = readMediaListPageAfterArchive({
        currentPage: meta.page,
        pageSize: meta.limit,
        status,
        total: meta.total,
      });

      if (nextPage !== meta.page) {
        setSearchParams(buildMediaListSearch({ page: nextPage, status, type }), {
          replace: true,
        });
      } else {
        await load(nextPage);
      }
    } catch (caught) {
      setArchiveError(formatRequestError(caught));
    } finally {
      setArchivingId(null);
    }
  }

  return (
    <div>
      <div
        style={{
          alignItems: "flex-start",
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div>
          <Typography.Title level={3}>Media</Typography.Title>
          <Typography.Paragraph>
            Upload assets, register external media, and use their{" "}
            <Typography.Text code>media://</Typography.Text> references in page
            content.
          </Typography.Paragraph>
        </div>
        <RegisterMediaModal onCreated={() => void load(meta.page)} />
      </div>
      <Segmented
        onChange={(value) => setStatus(value as MediaAssetListStatus)}
        options={[
          { label: "Active", value: "active" },
          { label: "Archived", value: "archived" },
          { label: "All", value: "all" },
        ]}
        style={{ marginBottom: 16 }}
        value={status}
      />
      <Select
        onChange={(value) =>
          setType(value === "all" ? null : (value as MediaAssetType))
        }
        options={mediaTypeFilterOptions}
        style={{ marginBottom: 16, marginLeft: 12, width: 180 }}
        value={type ?? "all"}
      />
      {error || archiveError ? (
        <Alert
          message={error ?? archiveError}
          showIcon
          style={{ marginBottom: 16 }}
          type="error"
        />
      ) : null}
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <MediaListTable
          archivingId={archivingId}
          assets={assets}
          isLoading={isLoading}
          onArchive={confirmArchive}
          onPageChange={setPage}
          page={meta.page}
          pageSize={meta.limit}
          total={meta.total}
        />
      </Space>
    </div>
  );
}
