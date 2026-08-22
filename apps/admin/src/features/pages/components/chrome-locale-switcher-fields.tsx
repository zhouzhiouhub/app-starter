import { Button, Form, Input, Space, Switch, Typography } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { toStorefrontPathPrefix, type PageSchema } from "@app-starter/schema";
import { readPublishPreflightFieldProps } from "../publish-preflight-field-focus";
import { readSafeHrefFeedback } from "../safe-href-feedback";

export function ChromeLocaleSwitcherFields(props: {
  highlightedField: string | null;
  onAdd: () => void;
  onEnabledChange: (enabled: boolean) => void;
  onLabelChange: (value: string) => void;
  onOptionChange: (
    index: number,
    field: "code" | "label" | "href",
    value: string,
  ) => void;
  onRemove: (index: number) => void;
  schema: PageSchema;
}) {
  const switcher = props.schema.chrome.header.content.localeSwitcher;

  return (
    <>
      <Typography.Title level={5}>Language switcher</Typography.Title>
      <Form.Item label="Switcher label">
        <div
          style={{
            alignItems: "center",
            display: "grid",
            gap: 12,
            gridTemplateColumns: "1fr auto",
          }}
        >
          <Input
            disabled={!switcher.enabled}
            onChange={(event) => props.onLabelChange(event.target.value)}
            value={switcher.label.defaultValue}
          />
          <Switch checked={switcher.enabled} onChange={props.onEnabledChange} />
        </div>
      </Form.Item>
      <Typography.Text strong>Locales</Typography.Text>
      <Space direction="vertical" size={12} style={{ marginTop: 12, width: "100%" }}>
        {switcher.locales.map((locale, index) => {
          const hrefFeedback = readSafeHrefFeedback(locale.href, {
            allowEmpty: true,
          });
          const hrefField = `chrome.header.content.localeSwitcher.locales[${index}].href`;

          return (
            <div
              key={`header-locale-${index}`}
              style={{
                alignItems: "start",
                display: "grid",
                gap: 8,
                gridTemplateColumns:
                  "minmax(0, 0.8fr) minmax(0, 1fr) minmax(0, 1fr) auto",
              }}
            >
              <Input
                aria-label="Locale code"
                disabled={!switcher.enabled}
                onChange={(event) =>
                  props.onOptionChange(index, "code", event.target.value)
                }
                placeholder="Code, e.g. en-US"
                value={locale.code}
              />
              <Input
                aria-label="Locale label"
                disabled={!switcher.enabled}
                onChange={(event) =>
                  props.onOptionChange(index, "label", event.target.value)
                }
                placeholder="Display name"
                value={locale.label.defaultValue}
              />
              <div
                {...readPublishPreflightFieldProps(
                  hrefField,
                  props.highlightedField,
                )}
              >
                <Form.Item
                  help={hrefFeedback.help}
                  style={{ marginBottom: 0 }}
                  validateStatus={hrefFeedback.status}
                >
                  <Input
                    aria-label="Locale link"
                    disabled={!switcher.enabled}
                    onChange={(event) =>
                      props.onOptionChange(index, "href", event.target.value)
                    }
                    placeholder={
                      locale.code
                        ? `/${toStorefrontPathPrefix(locale.code)}`
                        : "Link, e.g. /en"
                    }
                    value={locale.href ?? ""}
                  />
                </Form.Item>
              </div>
              <Button
                aria-label="Remove locale"
                danger
                disabled={!switcher.enabled}
                icon={<DeleteOutlined />}
                onClick={() => props.onRemove(index)}
              />
            </div>
          );
        })}
        <Button
          disabled={!switcher.enabled}
          icon={<PlusOutlined />}
          onClick={props.onAdd}
        >
          Add locale
        </Button>
      </Space>
    </>
  );
}
