import { Button, Descriptions, Form, Input, Space, Tag } from "antd";
import { useEffect } from "react";
import type { SiteSettings, UpdateSiteSettingsInput } from "../types";

export function SiteSettingsForm(props: {
  isSaving: boolean;
  onSave: (input: UpdateSiteSettingsInput) => void;
  settings: SiteSettings;
}) {
  const [form] = Form.useForm<UpdateSiteSettingsInput>();

  useEffect(() => {
    form.setFieldsValue({
      domain: props.settings.domain,
      name: props.settings.name,
    });
  }, [form, props.settings]);

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => props.onSave(values)}
        requiredMark={false}
      >
        <Form.Item
          label="Site name"
          name="name"
          rules={[
            { max: 120, message: "Site name must be 120 characters or fewer." },
            { required: true, message: "Site name is required." },
          ]}
        >
          <Input placeholder="Default Site" />
        </Form.Item>
        <Form.Item
          label="Domain"
          name="domain"
          rules={[
            { required: true, message: "Domain is required." },
            {
              message: "Enter a hostname without protocol or path.",
              pattern:
                /^(localhost|[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*)(?::[0-9]{1,5})?$/i,
            },
          ]}
        >
          <Input placeholder="example.com" />
        </Form.Item>
        <Button htmlType="submit" loading={props.isSaving} type="primary">
          Save settings
        </Button>
      </Form>
      <Descriptions
        bordered
        column={{ lg: 2, md: 2, sm: 1, xs: 1 }}
        items={[
          {
            key: "market",
            label: "Default market",
            children: props.settings.defaults.market,
          },
          {
            key: "locale",
            label: "Default locale",
            children: props.settings.defaults.locale,
          },
          {
            key: "currency",
            label: "Currency",
            children: props.settings.defaults.currency,
          },
          {
            key: "fallbackLocale",
            label: "Fallback locale",
            children: props.settings.defaults.fallbackLocale,
          },
          {
            key: "commerce",
            label: "Commerce",
            children: featureFlagTag(props.settings.featureFlags.commerceEnabled),
          },
          {
            key: "multiLocale",
            label: "Multi-locale",
            children: featureFlagTag(
              props.settings.featureFlags.multiLocaleEnabled,
            ),
          },
          {
            key: "analyticsEnabled",
            label: "Analytics",
            children: featureFlagTag(props.settings.analytics.enabled),
          },
          {
            key: "analyticsConsent",
            label: "Analytics consent",
            children: featureFlagTag(props.settings.analytics.consentGranted),
          },
          {
            key: "gtm",
            label: "GTM container",
            children: props.settings.analytics.gtmContainerId ?? "not configured",
          },
          {
            key: "ga4",
            label: "GA4 measurement",
            children:
              props.settings.analytics.ga4MeasurementId ?? "not configured",
          },
          {
            key: "clarity",
            label: "Clarity project",
            children:
              props.settings.analytics.clarityProjectId ?? "not configured",
          },
        ]}
        size="middle"
      />
    </Space>
  );
}

function featureFlagTag(enabled: boolean) {
  return <Tag color={enabled ? "green" : "default"}>{enabled ? "on" : "off"}</Tag>;
}
