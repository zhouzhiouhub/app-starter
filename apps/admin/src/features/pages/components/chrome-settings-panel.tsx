import { Alert, Divider, Form, Select, Typography } from "antd";
import {
  pageTemplatePresets,
  type PageSchema,
  type PageTemplateId,
} from "@app-starter/schema";
import {
  addNavigationItem,
  applyPageTemplate,
  removeNavigationItem,
  updateChromeEnabled,
  updateChromeVariant,
  updateNavigationItem,
} from "../chrome-region";
import {
  addHeaderLocaleOption,
  removeHeaderLocaleOption,
  updateHeaderBrand,
  updateHeaderLocaleOption,
  updateHeaderLocaleSwitcherEnabled,
  updateHeaderLocaleSwitcherLabel,
} from "../chrome-header-updates";
import { updateFooterBrand, updateFooterCopyright } from "../chrome-footer-updates";
import { pageTemplateOptions } from "../constants";
import { ChromeFooterContentFields } from "./chrome-footer-content-fields";
import { ChromeHeaderContentFields } from "./chrome-header-content-fields";
import { ChromeLocaleSwitcherFields } from "./chrome-locale-switcher-fields";
import { ChromeRegionToggles } from "./chrome-region-toggles";

export function ChromeSettingsPanel(props: {
  highlightedField: string | null;
  onChange: (schema: PageSchema) => void;
  schema: PageSchema;
}) {
  const activeTemplate = pageTemplatePresets[props.schema.template.id];

  function patch(updater: (current: PageSchema) => PageSchema) {
    props.onChange(updater(props.schema));
  }

  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #eee",
        borderRadius: 8,
        padding: 20,
      }}
    >
      <Typography.Title level={4}>Page settings</Typography.Title>
      <Form layout="vertical">
        <Form.Item label="Template">
          <Select<PageTemplateId>
            onChange={(templateId) =>
              patch((current) => applyPageTemplate(current, templateId))
            }
            options={pageTemplateOptions}
            value={props.schema.template.id}
          />
        </Form.Item>
        <Alert
          message={activeTemplate.description}
          showIcon
          style={{ marginBottom: 20 }}
          type="info"
        />
        <Divider />
        <ChromeRegionToggles
          onEnabledChange={(region, enabled) =>
            patch((current) => updateChromeEnabled(current, region, enabled))
          }
          onVariantChange={(region, variant) =>
            patch((current) => updateChromeVariant(current, region, variant))
          }
          schema={props.schema}
        />
        <Divider />
        <ChromeHeaderContentFields
          highlightedField={props.highlightedField}
          onAddNavigation={() =>
            patch((current) => addNavigationItem(current, "header"))
          }
          onBrandChange={(field, value) =>
            patch((current) => updateHeaderBrand(current, field, value))
          }
          onNavigationChange={(index, field, value) =>
            patch((current) =>
              updateNavigationItem(current, "header", index, field, value),
            )
          }
          onRemoveNavigation={(index) =>
            patch((current) => removeNavigationItem(current, "header", index))
          }
          schema={props.schema}
        />
        <Divider />
        <ChromeLocaleSwitcherFields
          highlightedField={props.highlightedField}
          onAdd={() => patch(addHeaderLocaleOption)}
          onEnabledChange={(enabled) =>
            patch((current) =>
              updateHeaderLocaleSwitcherEnabled(current, enabled),
            )
          }
          onLabelChange={(value) =>
            patch((current) => updateHeaderLocaleSwitcherLabel(current, value))
          }
          onOptionChange={(index, field, value) =>
            patch((current) =>
              updateHeaderLocaleOption(current, index, field, value),
            )
          }
          onRemove={(index) =>
            patch((current) => removeHeaderLocaleOption(current, index))
          }
          schema={props.schema}
        />
        <Alert
          message="This edits the switcher chrome only. MVP still serves en-US content for unpublished locales."
          showIcon
          style={{ marginTop: 12 }}
          type="info"
        />
        <Divider />
        <ChromeFooterContentFields
          highlightedField={props.highlightedField}
          onAddNavigation={() =>
            patch((current) => addNavigationItem(current, "footer"))
          }
          onBrandChange={(field, value) =>
            patch((current) => updateFooterBrand(current, field, value))
          }
          onCopyrightChange={(value) =>
            patch((current) => updateFooterCopyright(current, value))
          }
          onNavigationChange={(index, field, value) =>
            patch((current) =>
              updateNavigationItem(current, "footer", index, field, value),
            )
          }
          onRemoveNavigation={(index) =>
            patch((current) => removeNavigationItem(current, "footer", index))
          }
          schema={props.schema}
        />
      </Form>
      <Divider />
      <Typography.Title level={5}>Draft schema fragment</Typography.Title>
      <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
        {JSON.stringify(
          {
            chrome: props.schema.chrome,
            template: props.schema.template,
          },
          null,
          2,
        )}
      </pre>
    </section>
  );
}
