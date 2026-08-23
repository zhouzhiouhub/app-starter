import { Typography } from "antd";
import { readStorefrontPagePath } from "../storefront-path";
import { readStorefrontPageUrl } from "../storefront-url";

export function PageStorefrontUrlSummary(props: {
  locale: string;
  siteDomain: string;
  slug: string;
}) {
  const storefrontUrl = readStorefrontPageUrl({
    locale: props.locale,
    siteDomain: props.siteDomain,
    slug: props.slug,
  });
  const homePath = readStorefrontPagePath({
    locale: props.locale,
    slug: "home",
  });

  return (
    <Typography.Paragraph>
      Storefront URL:{" "}
      {storefrontUrl.ok ? (
        <Typography.Text code>{storefrontUrl.href}</Typography.Text>
      ) : (
        <Typography.Text type="warning">{storefrontUrl.message}</Typography.Text>
      )}
      . Home stays at{" "}
      {homePath.ok ? (
        <Typography.Text code>{homePath.href}</Typography.Text>
      ) : (
        <Typography.Text type="warning">{homePath.message}</Typography.Text>
      )}
      . Edit the page body below, then publish and open View on site.
    </Typography.Paragraph>
  );
}
