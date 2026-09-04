import { Form, Input } from "antd";
import type { ChromeBrand } from "@app-starter/schema";
import { readImageSrcFeedback } from "../image-src-feedback";
import { readPublishPreflightFieldProps } from "../publish-preflight-field-focus";
import { readSafeHrefFeedback } from "../safe-href-feedback";

export function ChromeBrandFields(props: {
  brand: ChromeBrand;
  fieldPathPrefix:
    "chrome.header.content.brand" | "chrome.footer.content.brand";
  highlightedField: string | null;
  onBrandChange: (field: "label" | "href" | "logoSrc", value: string) => void;
}) {
  const hrefField = `${props.fieldPathPrefix}.href`;
  const logoField = `${props.fieldPathPrefix}.logoSrc`;
  const brandHrefFeedback = readSafeHrefFeedback(props.brand.href);
  const brandLogoFeedback = readImageSrcFeedback(props.brand.logoSrc);

  return (
    <>
      <Form.Item label="Brand text">
        <Input
          onChange={(event) => props.onBrandChange("label", event.target.value)}
          value={props.brand.label.defaultValue}
        />
      </Form.Item>
      <div
        {...readPublishPreflightFieldProps(logoField, props.highlightedField)}
      >
        <Form.Item
          help={brandLogoFeedback.help}
          label="Brand logo"
          validateStatus={brandLogoFeedback.status}
        >
          <Input
            onChange={(event) =>
              props.onBrandChange("logoSrc", event.target.value)
            }
            placeholder="/brand/kinolin-logo.svg"
            value={props.brand.logoSrc}
          />
        </Form.Item>
      </div>
      <div
        {...readPublishPreflightFieldProps(hrefField, props.highlightedField)}
      >
        <Form.Item
          help={brandHrefFeedback.help}
          label="Brand link"
          validateStatus={brandHrefFeedback.status}
        >
          <Input
            onChange={(event) =>
              props.onBrandChange("href", event.target.value)
            }
            value={props.brand.href}
          />
        </Form.Item>
      </div>
    </>
  );
}
