import { useState } from "react";
import {
  AppstoreOutlined,
  DeleteOutlined,
  FileTextOutlined,
  GlobalOutlined,
  PictureOutlined,
  PlusOutlined,
  SettingOutlined,
  UploadOutlined
} from "@ant-design/icons";
import {
  Alert,
  Button,
  ConfigProvider,
  Divider,
  Form,
  Input,
  Layout,
  Menu,
  Segmented,
  Select,
  Space,
  Switch,
  Tag,
  Typography
} from "antd";
import { adminTheme } from "@app-starter/admin-theme";
import { customAdminRoutes } from "@app-starter/custom-admin";
import { PageRenderer } from "@app-starter/renderer";
import {
  exampleLandingPage,
  getPageTemplateChrome,
  pageSchema,
  pageTemplatePresets,
  type ChromeNavigationItem,
  type PageChromeSettings,
  type PageSchema,
  type PageTemplateId,
  type Viewport
} from "@app-starter/schema";

const { Header, Content, Sider } = Layout;
const { Paragraph, Text, Title } = Typography;

type ChromeRegionKey = keyof PageChromeSettings;
type PublishFeedback = {
  type: "success" | "error";
  message: string;
};

const templateOptions = Object.values(pageTemplatePresets).map((template) => ({
  label: template.label,
  value: template.id
}));

const apiBaseUrl =
  (
    import.meta as unknown as {
      env?: { VITE_API_URL?: string };
    }
  ).env?.VITE_API_URL ?? "http://localhost:4000/api/v1";

function createIdempotencyKey(): string {
  const cryptoApi = globalThis.crypto;

  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }

  const bytes = new Uint8Array(16);

  if (cryptoApi?.getRandomValues) {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

export function App() {
  const [draftSchema, setDraftSchema] = useState<PageSchema>(exampleLandingPage);
  const [publishFeedback, setPublishFeedback] =
    useState<PublishFeedback | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [viewport, setViewport] = useState<Viewport>("desktop");

  const items = [
    { key: "dashboard", icon: <AppstoreOutlined />, label: "Dashboard" },
    { key: "pages", icon: <FileTextOutlined />, label: "Pages" },
    { key: "media", icon: <PictureOutlined />, label: "Media" },
    { key: "localization", icon: <GlobalOutlined />, label: "Localization" },
    { key: "settings", icon: <SettingOutlined />, label: "Settings" }
  ];

  const activeTemplate = pageTemplatePresets[draftSchema.template.id];

  function applyTemplate(templateId: PageTemplateId) {
    setDraftSchema((current) => ({
      ...current,
      template: { id: templateId },
      chrome: getPageTemplateChrome(templateId)
    }));
  }

  function updateChrome(region: ChromeRegionKey, enabled: boolean) {
    setDraftSchema((current) => ({
      ...current,
      chrome: {
        ...current.chrome,
        [region]: {
          ...current.chrome[region],
          enabled
        }
      }
    }));
  }

  function updateChromeVariant(
    region: ChromeRegionKey,
    variant: PageChromeSettings[ChromeRegionKey]["variant"]
  ) {
    setDraftSchema((current) => ({
      ...current,
      chrome: {
        ...current.chrome,
        [region]: {
          ...current.chrome[region],
          variant
        }
      }
    }));
  }

  function updateHeaderBrand(field: "label" | "href", value: string) {
    setDraftSchema((current) => {
      const content = current.chrome.header.content;
      const brand =
        field === "label"
          ? {
              ...content.brand,
              label: {
                ...content.brand.label,
                defaultValue: value
              }
            }
          : {
              ...content.brand,
              href: value
            };

      return {
        ...current,
        chrome: {
          ...current.chrome,
          header: {
            ...current.chrome.header,
            content: {
              ...content,
              brand
            }
          }
        }
      };
    });
  }

  function updateFooterBrand(field: "label" | "href", value: string) {
    setDraftSchema((current) => {
      const content = current.chrome.footer.content;
      const brand =
        field === "label"
          ? {
              ...content.brand,
              label: {
                ...content.brand.label,
                defaultValue: value
              }
            }
          : {
              ...content.brand,
              href: value
            };

      return {
        ...current,
        chrome: {
          ...current.chrome,
          footer: {
            ...current.chrome.footer,
            content: {
              ...content,
              brand
            }
          }
        }
      };
    });
  }

  function updateFooterCopyright(value: string) {
    setDraftSchema((current) => {
      const content = current.chrome.footer.content;

      return {
        ...current,
        chrome: {
          ...current.chrome,
          footer: {
            ...current.chrome.footer,
            content: {
              ...content,
              copyright: {
                ...content.copyright,
                defaultValue: value
              }
            }
          }
        }
      };
    });
  }

  function updateNavigationItem(
    region: ChromeRegionKey,
    index: number,
    field: "label" | "href",
    value: string
  ) {
    setDraftSchema((current) => {
      const chromeRegion = current.chrome[region];
      const navigation = chromeRegion.content.navigation.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        return field === "label"
          ? {
              ...item,
              label: {
                ...item.label,
                defaultValue: value
              }
            }
          : {
              ...item,
              href: value
            };
      });

      return {
        ...current,
        chrome: {
          ...current.chrome,
          [region]: {
            ...chromeRegion,
            content: {
              ...chromeRegion.content,
              navigation
            }
          }
        }
      };
    });
  }

  function addNavigationItem(region: ChromeRegionKey) {
    setDraftSchema((current) => {
      const chromeRegion = current.chrome[region];
      const itemNumber = chromeRegion.content.navigation.length + 1;
      const item: ChromeNavigationItem = {
        id: `${region}-link-${Date.now()}`,
        label: { defaultValue: `Link ${itemNumber}` },
        href: "/",
        openInNewTab: false
      };

      return {
        ...current,
        chrome: {
          ...current.chrome,
          [region]: {
            ...chromeRegion,
            content: {
              ...chromeRegion.content,
              navigation: [...chromeRegion.content.navigation, item]
            }
          }
        }
      };
    });
  }

  function removeNavigationItem(region: ChromeRegionKey, index: number) {
    setDraftSchema((current) => {
      const chromeRegion = current.chrome[region];

      return {
        ...current,
        chrome: {
          ...current.chrome,
          [region]: {
            ...chromeRegion,
            content: {
              ...chromeRegion.content,
              navigation: chromeRegion.content.navigation.filter(
                (_, itemIndex) => itemIndex !== index
              )
            }
          }
        }
      };
    });
  }

  async function publishDraft() {
    const parsed = pageSchema.safeParse(draftSchema);

    if (!parsed.success) {
      setPublishFeedback({
        type: "error",
        message:
          parsed.error.issues[0]?.message ??
          "Page schema is invalid and cannot be published."
      });
      return;
    }

    setIsPublishing(true);

    try {
      const response = await fetch(
        `${apiBaseUrl}/admin/pages/${encodeURIComponent(
          parsed.data.meta.slug
        )}/publish`,
        {
          body: JSON.stringify({ data: parsed.data }),
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": createIdempotencyKey()
          },
          method: "POST"
        }
      );

      const result = (await response.json()) as { data?: unknown; message?: string };

      if (!response.ok) {
        throw new Error(result.message ?? "Publish request failed.");
      }

      const published = pageSchema.parse(result.data);
      setDraftSchema(published);
      setPublishFeedback({
        type: "success",
        message:
          "Published. Refresh the storefront page to load the latest published content."
      });
    } catch (error) {
      setPublishFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Publish request failed."
      });
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <ConfigProvider theme={adminTheme}>
      <Layout style={{ minHeight: "100vh" }}>
        <Sider width={240}>
          <div style={{ color: "white", fontWeight: 700, padding: 20 }}>
            App Starter
          </div>
          <Menu items={items} mode="inline" theme="dark" />
        </Sider>
        <Layout>
          <Header style={{ background: "#fff", borderBottom: "1px solid #eee" }}>
            <Typography.Text strong>Engineering Scaffold</Typography.Text>
          </Header>
          <Content style={{ padding: 24 }}>
            <div
              style={{
                alignItems: "flex-start",
                display: "flex",
                gap: 16,
                justifyContent: "space-between"
              }}
            >
              <div>
                <Title level={3}>Pages</Title>
                <Paragraph>
                  Page Builder stores layout chrome in Page Schema. Published pages
                  render header and footer from that schema instead of route-level
                  code.
                </Paragraph>
              </div>
              <Button
                icon={<UploadOutlined />}
                loading={isPublishing}
                onClick={publishDraft}
                type="primary"
              >
                Publish
              </Button>
            </div>
            {publishFeedback ? (
              <Alert
                closable
                message={publishFeedback.message}
                onClose={() => setPublishFeedback(null)}
                showIcon
                style={{ marginBottom: 16 }}
                type={publishFeedback.type}
              />
            ) : null}
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              <Tag color="blue">DEFAULT_LOCALE=en-US</Tag>
              <Tag color="default">COMMERCE_ENABLED=false</Tag>
              <Tag color="default">MULTI_LOCALE_ENABLED=false</Tag>
            </div>
            <div
              style={{
                display: "grid",
                gap: 24,
                gridTemplateColumns: "minmax(320px, 420px) minmax(0, 1fr)"
              }}
            >
              <section
                style={{
                  background: "#fff",
                  border: "1px solid #eee",
                  borderRadius: 8,
                  padding: 20
                }}
              >
                <Title level={4}>Page settings</Title>
                <Form layout="vertical">
                  <Form.Item label="Template">
                    <Select<PageTemplateId>
                      onChange={applyTemplate}
                      options={templateOptions}
                      value={draftSchema.template.id}
                    />
                  </Form.Item>
                  <Alert
                    message={activeTemplate.description}
                    showIcon
                    style={{ marginBottom: 20 }}
                    type="info"
                  />
                  <Divider />
                  <Space direction="vertical" size={18} style={{ width: "100%" }}>
                    <div>
                      <Text strong>Header</Text>
                      <div
                        style={{
                          alignItems: "center",
                          display: "grid",
                          gap: 12,
                          gridTemplateColumns: "1fr auto"
                        }}
                      >
                        <Select
                          disabled={!draftSchema.chrome.header.enabled}
                          onChange={(value) =>
                            updateChromeVariant("header", value)
                          }
                          options={[
                            { label: "Default", value: "default" },
                            { label: "Minimal", value: "minimal" }
                          ]}
                          value={draftSchema.chrome.header.variant}
                        />
                        <Switch
                          checked={draftSchema.chrome.header.enabled}
                          onChange={(checked) => updateChrome("header", checked)}
                        />
                      </div>
                    </div>
                    <div>
                      <Text strong>Footer</Text>
                      <div
                        style={{
                          alignItems: "center",
                          display: "grid",
                          gap: 12,
                          gridTemplateColumns: "1fr auto"
                        }}
                      >
                        <Select
                          disabled={!draftSchema.chrome.footer.enabled}
                          onChange={(value) =>
                            updateChromeVariant("footer", value)
                          }
                          options={[
                            { label: "Default", value: "default" },
                            { label: "Minimal", value: "minimal" }
                          ]}
                          value={draftSchema.chrome.footer.variant}
                        />
                        <Switch
                          checked={draftSchema.chrome.footer.enabled}
                          onChange={(checked) => updateChrome("footer", checked)}
                        />
                      </div>
                    </div>
                  </Space>
                  <Divider />
                  <Title level={5}>Header content</Title>
                  <Form.Item label="Brand text">
                    <Input
                      onChange={(event) =>
                        updateHeaderBrand("label", event.target.value)
                      }
                      value={
                        draftSchema.chrome.header.content.brand.label.defaultValue
                      }
                    />
                  </Form.Item>
                  <Form.Item label="Brand link">
                    <Input
                      onChange={(event) =>
                        updateHeaderBrand("href", event.target.value)
                      }
                      value={draftSchema.chrome.header.content.brand.href}
                    />
                  </Form.Item>
                  <Text strong>Menu items</Text>
                  <Space
                    direction="vertical"
                    size={12}
                    style={{ marginTop: 12, width: "100%" }}
                  >
                    {draftSchema.chrome.header.content.navigation.map(
                      (item, index) => (
                        <div
                          key={item.id}
                          style={{
                            alignItems: "center",
                            display: "grid",
                            gap: 8,
                            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) auto"
                          }}
                        >
                          <Input
                            aria-label="Header menu label"
                            onChange={(event) =>
                              updateNavigationItem(
                                "header",
                                index,
                                "label",
                                event.target.value
                              )
                            }
                            value={item.label.defaultValue}
                          />
                          <Input
                            aria-label="Header menu link"
                            onChange={(event) =>
                              updateNavigationItem(
                                "header",
                                index,
                                "href",
                                event.target.value
                              )
                            }
                            value={item.href}
                          />
                          <Button
                            aria-label="Remove header menu item"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => removeNavigationItem("header", index)}
                          />
                        </div>
                      )
                    )}
                    <Button
                      icon={<PlusOutlined />}
                      onClick={() => addNavigationItem("header")}
                    >
                      Add menu item
                    </Button>
                  </Space>
                  <Divider />
                  <Title level={5}>Footer content</Title>
                  <Form.Item label="Brand text">
                    <Input
                      onChange={(event) =>
                        updateFooterBrand("label", event.target.value)
                      }
                      value={
                        draftSchema.chrome.footer.content.brand.label.defaultValue
                      }
                    />
                  </Form.Item>
                  <Form.Item label="Brand link">
                    <Input
                      onChange={(event) =>
                        updateFooterBrand("href", event.target.value)
                      }
                      value={draftSchema.chrome.footer.content.brand.href}
                    />
                  </Form.Item>
                  <Form.Item label="Copyright">
                    <Input
                      onChange={(event) =>
                        updateFooterCopyright(event.target.value)
                      }
                      value={
                        draftSchema.chrome.footer.content.copyright.defaultValue
                      }
                    />
                  </Form.Item>
                  <Text strong>Footer links</Text>
                  <Space
                    direction="vertical"
                    size={12}
                    style={{ marginTop: 12, width: "100%" }}
                  >
                    {draftSchema.chrome.footer.content.navigation.map(
                      (item, index) => (
                        <div
                          key={item.id}
                          style={{
                            alignItems: "center",
                            display: "grid",
                            gap: 8,
                            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) auto"
                          }}
                        >
                          <Input
                            aria-label="Footer link label"
                            onChange={(event) =>
                              updateNavigationItem(
                                "footer",
                                index,
                                "label",
                                event.target.value
                              )
                            }
                            value={item.label.defaultValue}
                          />
                          <Input
                            aria-label="Footer link URL"
                            onChange={(event) =>
                              updateNavigationItem(
                                "footer",
                                index,
                                "href",
                                event.target.value
                              )
                            }
                            value={item.href}
                          />
                          <Button
                            aria-label="Remove footer link"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => removeNavigationItem("footer", index)}
                          />
                        </div>
                      )
                    )}
                    <Button
                      icon={<PlusOutlined />}
                      onClick={() => addNavigationItem("footer")}
                    >
                      Add footer link
                    </Button>
                  </Space>
                </Form>
                <Divider />
                <Title level={5}>Draft schema fragment</Title>
                <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                  {JSON.stringify(
                    {
                      template: draftSchema.template,
                      chrome: draftSchema.chrome
                    },
                    null,
                    2
                  )}
                </pre>
              </section>
              <section
                style={{
                  background: "#fff",
                  border: "1px solid #eee",
                  borderRadius: 8,
                  minWidth: 0,
                  padding: 20
                }}
              >
                <div
                  style={{
                    alignItems: "center",
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 16
                  }}
                >
                  <Title level={4} style={{ margin: 0 }}>
                    Preview
                  </Title>
                  <Segmented
                    onChange={(value) => setViewport(value as Viewport)}
                    options={[
                      { label: "Desktop", value: "desktop" },
                      { label: "Mobile", value: "mobile" }
                    ]}
                    value={viewport}
                  />
                </div>
                <div
                  style={{
                    border: "1px solid #eee",
                    margin: "0 auto",
                    maxWidth: viewport === "mobile" ? 390 : "100%",
                    minHeight: 480,
                    overflow: "hidden"
                  }}
                >
                  <PageRenderer schema={draftSchema} viewport={viewport} />
                </div>
              </section>
            </div>
            <Divider />
            <Title level={4}>Custom admin routes</Title>
            <pre>{JSON.stringify(customAdminRoutes, null, 2)}</pre>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
