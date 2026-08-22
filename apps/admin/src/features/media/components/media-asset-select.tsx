import { Select, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import type { MediaAssetReference } from "@app-starter/schema";
import { listMediaAssets } from "../api";
import { readMediaAssetSelectState } from "../media-asset-select-state";
import type { MediaAsset } from "../types";
import { formatRequestError } from "../../../lib/api-error";

export function MediaAssetSelect(props: {
  onSelect: (asset: MediaAsset) => void;
  placeholder?: string;
  value?: string;
}) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    listMediaAssets(1, 100)
      .then((result) => {
        if (active) {
          setAssets(result.data.filter((asset) => asset.type === "image"));
        }
      })
      .catch((caught) => {
        if (active) {
          setAssets([]);
          setError(formatRequestError(caught));
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const state = readMediaAssetSelectState({
    assets,
    error,
    isLoading,
    value: props.value,
  });
  const options = useMemo(() => {
    const activeOptions = assets.map((asset) => ({
        label: (
          <span>
            {asset.filename}{" "}
            <Typography.Text type="secondary">
              {asset.reference}
            </Typography.Text>
          </span>
        ),
        value: asset.reference,
      }));

    if (
      props.value &&
      !assets.some((asset) => asset.reference === props.value)
    ) {
      return [
        {
          label: (
            <Typography.Text type="warning">
              {props.value}
            </Typography.Text>
          ),
          value: props.value,
        },
        ...activeOptions,
      ];
    }

    return activeOptions;
  }, [assets, props.value]);

  return (
    <>
      <Select
        loading={isLoading}
        notFoundContent={state.notFoundContent}
        onChange={(reference: MediaAssetReference) => {
          const selected = assets.find((asset) => asset.reference === reference);

          if (selected) {
            props.onSelect(selected);
          }
        }}
        optionFilterProp="label"
        options={options}
        placeholder={props.placeholder ?? "Choose from Media"}
        showSearch
        status={state.status}
        style={{ width: "100%" }}
        value={props.value || undefined}
      />
      {state.help ? (
        <Typography.Text type={state.status === "error" ? "danger" : "warning"}>
          {state.help}
        </Typography.Text>
      ) : null}
    </>
  );
}
