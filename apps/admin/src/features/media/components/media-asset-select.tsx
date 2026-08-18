import { Select, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import type { MediaAssetReference } from "@app-starter/schema";
import { listMediaAssets } from "../api";
import type { MediaAsset } from "../types";

export function MediaAssetSelect(props: {
  onSelect: (asset: MediaAsset) => void;
  placeholder?: string;
  value?: string;
}) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    listMediaAssets(1, 100)
      .then((result) => {
        if (active) {
          setAssets(result.data.filter((asset) => asset.type === "image"));
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const options = useMemo(
    () =>
      assets.map((asset) => ({
        label: (
          <span>
            {asset.filename}{" "}
            <Typography.Text type="secondary">
              {asset.reference}
            </Typography.Text>
          </span>
        ),
        value: asset.reference,
      })),
    [assets],
  );

  return (
    <Select
      loading={isLoading}
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
      style={{ width: "100%" }}
      value={props.value || undefined}
    />
  );
}
