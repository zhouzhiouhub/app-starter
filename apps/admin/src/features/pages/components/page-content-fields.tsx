import { Divider, Form, Input, Typography } from "antd";
import type { PageSchema } from "@app-starter/schema";
import {
  readSectionText,
  updateFirstHeroField,
  updateFirstRichTextField,
  updatePageMetaTitle,
} from "../section-content-updates";

export function PageContentFields(props: {
  onChange: (schema: PageSchema) => void;
  schema: PageSchema;
}) {
  const hero = props.schema.sections.find(
    (section) => section.component === "hero-banner",
  );
  const richText = props.schema.sections.find(
    (section) => section.component === "rich-text",
  );

  function patch(updater: (current: PageSchema) => PageSchema) {
    props.onChange(updater(props.schema));
  }

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
      <Typography.Title level={4}>Page content</Typography.Title>
      <Typography.Paragraph type="secondary">
        This is the body visitors see on the storefront. Header and footer are
        edited below.
      </Typography.Paragraph>
      <Form layout="vertical">
        <Form.Item label="Page title">
          <Input
            onChange={(event) =>
              patch((current) =>
                updatePageMetaTitle(current, event.target.value),
              )
            }
            value={props.schema.meta.title}
          />
        </Form.Item>
        {hero ? (
          <>
            <Divider />
            <Typography.Title level={5}>Hero</Typography.Title>
            <Form.Item label="Eyebrow">
              <Input
                onChange={(event) =>
                  patch((current) =>
                    updateFirstHeroField(
                      current,
                      "eyebrow",
                      event.target.value,
                    ),
                  )
                }
                value={readSectionText(hero.props.eyebrow)}
              />
            </Form.Item>
            <Form.Item label="Headline">
              <Input
                onChange={(event) =>
                  patch((current) =>
                    updateFirstHeroField(current, "title", event.target.value),
                  )
                }
                value={readSectionText(hero.props.title)}
              />
            </Form.Item>
            <Form.Item label="Body">
              <Input.TextArea
                onChange={(event) =>
                  patch((current) =>
                    updateFirstHeroField(current, "body", event.target.value),
                  )
                }
                rows={4}
                value={readSectionText(hero.props.body)}
              />
            </Form.Item>
          </>
        ) : null}
        {richText ? (
          <>
            <Divider />
            <Typography.Title level={5}>Text section</Typography.Title>
            <Form.Item label="Heading">
              <Input
                onChange={(event) =>
                  patch((current) =>
                    updateFirstRichTextField(
                      current,
                      "title",
                      event.target.value,
                    ),
                  )
                }
                value={readSectionText(richText.props.title)}
              />
            </Form.Item>
            <Form.Item label="Content">
              <Input.TextArea
                onChange={(event) =>
                  patch((current) =>
                    updateFirstRichTextField(
                      current,
                      "content",
                      event.target.value,
                    ),
                  )
                }
                rows={4}
                value={readSectionText(richText.props.content)}
              />
            </Form.Item>
          </>
        ) : null}
      </Form>
    </section>
  );
}
