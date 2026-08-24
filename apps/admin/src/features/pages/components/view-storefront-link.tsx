import { Button } from "antd";
import { ExportOutlined } from "@ant-design/icons";
import {
  storefrontExternalLinkRel,
  storefrontExternalLinkTarget,
} from "../storefront-link-policy";
import { readStorefrontPageUrl } from "../storefront-url";

export function ViewStorefrontLink(props: {
  locale: string;
  published: boolean;
  siteDomain: string;
  slug: string;
}) {
  const storefrontUrl = readStorefrontPageUrl({
    locale: props.locale,
    siteDomain: props.siteDomain,
    slug: props.slug,
  });
  const disabled = !props.published || !storefrontUrl.ok;

  return (
    <Button
      disabled={disabled}
      href={storefrontUrl.ok ? storefrontUrl.href : undefined}
      icon={<ExportOutlined />}
      rel={storefrontExternalLinkRel}
      target={storefrontExternalLinkTarget}
      title={storefrontUrl.ok ? "View on site" : storefrontUrl.message}
      type="link"
    >
      View
    </Button>
  );
}
