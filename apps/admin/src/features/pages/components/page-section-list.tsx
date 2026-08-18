import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  HolderOutlined,
} from "@ant-design/icons";
import { Button, Empty, List, Space, Tooltip, Typography } from "antd";
import type { PageSchema, SectionNode } from "@app-starter/schema";
import { moveSection } from "../section-order-updates";
import { readSectionText } from "../section-content-updates";

export function PageSectionList(props: {
  onChange: (schema: PageSchema) => void;
  schema: PageSchema;
}) {
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
      <Typography.Title level={4}>Sections</Typography.Title>
      {props.schema.sections.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          dataSource={props.schema.sections}
          renderItem={(section, index) => (
            <List.Item
              actions={[
                <Tooltip key="up" title="Move up">
                  <Button
                    aria-label={`Move ${sectionLabel(section)} up`}
                    disabled={index === 0}
                    icon={<ArrowUpOutlined />}
                    onClick={() =>
                      props.onChange(moveSection(props.schema, section.id, "up"))
                    }
                    size="small"
                  />
                </Tooltip>,
                <Tooltip key="down" title="Move down">
                  <Button
                    aria-label={`Move ${sectionLabel(section)} down`}
                    disabled={index === props.schema.sections.length - 1}
                    icon={<ArrowDownOutlined />}
                    onClick={() =>
                      props.onChange(
                        moveSection(props.schema, section.id, "down"),
                      )
                    }
                    size="small"
                  />
                </Tooltip>,
              ]}
            >
              <List.Item.Meta
                avatar={<HolderOutlined style={{ color: "#8c8c8c" }} />}
                description={section.component}
                title={
                  <Space size={8}>
                    <Typography.Text strong>
                      {index + 1}. {sectionLabel(section)}
                    </Typography.Text>
                    <Typography.Text code>{section.id}</Typography.Text>
                  </Space>
                }
              />
            </List.Item>
          )}
          size="small"
        />
      )}
    </section>
  );
}

function sectionLabel(section: SectionNode): string {
  const title = readSectionText(section.props.title);

  if (title) {
    return title;
  }

  const eyebrow = readSectionText(section.props.eyebrow);
  return eyebrow || section.component;
}
