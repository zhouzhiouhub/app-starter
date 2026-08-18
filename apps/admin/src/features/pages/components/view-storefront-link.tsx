import { Button } from "antd";
import { ExportOutlined } from "@ant-design/icons";
import { getStorefrontPageUrl } from "../storefront-url";

export function ViewStorefrontLink(props: {
  published: boolean;
  slug: string;
}) {
  return (
    <Button
      disabled={!props.published}
      href={getStorefrontPageUrl(props.slug)}
      icon={<ExportOutlined />}
      rel="noreferrer"
      target="_blank"
      type="link"
    >
      View
    </Button>
  );
}
