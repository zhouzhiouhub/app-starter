import { Alert, Modal, Segmented, Space, Typography } from "antd";
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
} from "../../features/media/media-list-query";
import type {
  MediaAsset,
  MediaAssetListStatus,
} from "../../features/media/types";
import { formatRequestError } from "../../lib/api-error";

export function MediaPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = useMemo(
    () => readMediaListStatus(searchParams),
    [searchParams],
  );
  const page = useMemo(() => readMediaListPage(searchParams), [searchParams]);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const { assets, error, isLoading, load, meta } = useMediaList(status, page);
  const setStatus = useCallback(
    (nextStatus: MediaAssetListStatus) => {
      setSearchParams(buildMediaListSearch({ status: nextStatus }), {
        replace: true,
      });
    },
    [setSearchParams],
  );
  const setPage = useCallback(
    (nextPage: number) => {
      setSearchParams(buildMediaListSearch({ page: nextPage, status }), {
        replace: true,
      });
    },
    [setSearchParams, status],
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
      await load(meta.page);
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
