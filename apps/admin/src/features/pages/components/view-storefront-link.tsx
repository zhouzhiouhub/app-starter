import { Button } from "antd";
import { ExportOutlined } from "@ant-design/icons";
import { getStorefrontPageUrl } from "../storefront-url";

export function ViewStorefrontLink(props: {
  published: boolean;
  siteDomain: string;
  slug: string;
}) {
  return (
    <Button
      disabled={!props.published}
      href={getStorefrontPageUrl(props.slug, "en-US", props.siteDomain)}
      icon={<ExportOutlined />}
      rel="noreferrer"
      target="_blank"
      type="link"
    >
      View
    </Button>
  );
}
