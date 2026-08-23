import { Typography } from "antd";
import { getStorefrontPagePath, getStorefrontPageUrl } from "../storefront-url";

export function PageStorefrontUrlSummary(props: {
  locale: string;
  siteDomain: string;
  slug: string;
}) {
  return (
    <Typography.Paragraph>
      Storefront URL:{" "}
      <Typography.Text code>
        {getStorefrontPageUrl(props.slug, props.locale, props.siteDomain)}
      </Typography.Text>
      . Home stays at{" "}
      <Typography.Text code>
        {getStorefrontPagePath("home", props.locale)}
      </Typography.Text>
      . Edit the page body below, then publish and open View on site.
    </Typography.Paragraph>
  );
}
