import { Typography } from "antd";
import { getStorefrontPagePath, readStorefrontPageUrl } from "../storefront-url";

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

  return (
    <Typography.Paragraph>
      Storefront URL:{" "}
      {storefrontUrl.ok ? (
        <Typography.Text code>{storefrontUrl.href}</Typography.Text>
      ) : (
        <Typography.Text type="warning">{storefrontUrl.message}</Typography.Text>
      )}
      . Home stays at{" "}
      <Typography.Text code>
        {getStorefrontPagePath("home", props.locale)}
      </Typography.Text>
      . Edit the page body below, then publish and open View on site.
    </Typography.Paragraph>
  );
}
