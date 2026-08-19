import { Empty, Form, Input, Typography } from "antd";
import type { PageSchema, SectionNode, Viewport } from "@app-starter/schema";
import {
  readCtaHrefFeedback,
  readCtaLabelFeedback,
  type CtaFieldFeedback,
} from "../cta-feedback";
import {
  readRichTextFeedback,
  type RichTextFeedback,
} from "../rich-text-feedback";
import {
  readSectionText,
  updateSectionTextField,
  type SectionTextValueKind,
} from "../section-content-updates";
import { FaqItemsFields } from "./faq-items-fields";
import { ImageGalleryFields } from "./image-gallery-fields";
import { SectionLayoutFields } from "./section-layout-fields";
import { SpecTableFields } from "./spec-table-fields";

interface SectionPropertyField {
  control: "input" | "textarea";
  label: string;
  name: string;
  valueKind: SectionTextValueKind;
}

const sectionPropertyFields: Record<string, SectionPropertyField[]> = {
  "cta-bar": [
    { control: "input", label: "Title", name: "title", valueKind: "i18n" },
    {
      control: "input",
      label: "CTA label",
      name: "ctaLabel",
      valueKind: "plain",
    },
    {
      control: "input",
      label: "CTA link",
      name: "ctaHref",
      valueKind: "plain",
    },
  ],
  "hero-banner": [
    { control: "input", label: "Eyebrow", name: "eyebrow", valueKind: "plain" },
    { control: "input", label: "Headline", name: "title", valueKind: "i18n" },
    { control: "textarea", label: "Body", name: "body", valueKind: "i18n" },
    {
      control: "input",
      label: "CTA label",
      name: "ctaLabel",
      valueKind: "plain",
    },
    {
      control: "input",
      label: "CTA link",
      name: "ctaHref",
      valueKind: "plain",
    },
  ],
  "rich-text": [
    { control: "input", label: "Heading", name: "title", valueKind: "i18n" },
    {
      control: "textarea",
      label: "Content",
      name: "content",
      valueKind: "i18n",
    },
  ],
};

export function SectionPropertiesPanel(props: {
  onChange: (schema: PageSchema) => void;
  schema: PageSchema;
  section: SectionNode | null;
  viewport: Viewport;
}) {
  const section = props.section;
  const fields = section ? (sectionPropertyFields[section.component] ?? []) : [];

  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #eee",
        borderRadius: 8,
        marginBottom: 24,
        padding: 20,
      }}
    >
      <Typography.Title level={4}>Section properties</Typography.Title>
      {!section ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Form layout="vertical">
          {fields.map((field) => {
            const value = readSectionText(section.props[field.name]);
            const feedback = readSectionPropertyFeedback(section, field, value);

            return (
              <Form.Item
                help={feedback.help}
                key={field.name}
                label={field.label}
                validateStatus={feedback.status}
              >
                {field.control === "textarea" ? (
                  <Input.TextArea
                    onChange={(event) =>
                      props.onChange(
                        updateSectionTextField(
                          props.schema,
                          section.id,
                          field.name,
                          event.target.value,
                          field.valueKind,
                        ),
                      )
                    }
                    rows={4}
                    value={value}
                  />
                ) : (
                  <Input
                    onChange={(event) =>
                      props.onChange(
                        updateSectionTextField(
                          props.schema,
                          section.id,
                          field.name,
                          event.target.value,
                          field.valueKind,
                        ),
                      )
                    }
                    value={value}
                  />
                )}
              </Form.Item>
            );
          })}
          {section.component === "faq" ? (
            <FaqItemsFields
              onChange={props.onChange}
              schema={props.schema}
              section={section}
            />
          ) : null}
          {section.component === "image-gallery" ? (
            <ImageGalleryFields
              onChange={props.onChange}
              schema={props.schema}
              section={section}
            />
          ) : null}
          {section.component === "spec-table" ? (
            <SpecTableFields
              onChange={props.onChange}
              schema={props.schema}
              section={section}
            />
          ) : null}
          <SectionLayoutFields
            onChange={props.onChange}
            schema={props.schema}
            section={section}
            viewport={props.viewport}
          />
        </Form>
      )}
    </section>
  );
}

function readSectionPropertyFeedback(
  section: SectionNode,
  field: SectionPropertyField,
  value: string,
): CtaFieldFeedback | RichTextFeedback {
  if (field.name === "ctaHref") {
    return readCtaHrefFeedback(
      readSectionText(section.props.ctaLabel),
      value,
    );
  }

  if (field.name === "ctaLabel") {
    return readCtaLabelFeedback(
      value,
      readSectionText(section.props.ctaHref),
    );
  }

  if (section.component === "rich-text" && field.name === "content") {
    return readRichTextFeedback(value);
  }

  return {};
}
