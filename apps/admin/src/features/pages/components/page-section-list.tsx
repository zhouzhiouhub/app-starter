import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CopyOutlined,
  DeleteOutlined,
  HolderOutlined,
} from "@ant-design/icons";
import { Button, Empty, List, Modal, Space, Tooltip, Typography } from "antd";
import {
  getOrderedSectionsForViewport,
  type PageSchema,
  type SectionNode,
  type Viewport,
} from "@app-starter/schema";
import { copyAllDesktopLayoutsToMobile } from "../section-layout-updates";
import {
  copyDesktopSectionOrderToMobile,
  moveSection,
} from "../section-order-updates";
import { readSectionText } from "../section-content-updates";
import {
  duplicateSection,
  getNextSelectedSectionId,
  removeSection,
} from "../section-management-updates";

export function PageSectionList(props: {
  onChange: (schema: PageSchema) => void;
  onSelect: (sectionId: string) => void;
  selectedSectionId: string | null;
  schema: PageSchema;
  viewport: Viewport;
}) {
  const sections = getOrderedSectionsForViewport(props.schema, props.viewport);

  function handleDuplicate(section: SectionNode) {
    const result = duplicateSection(props.schema, section.id);
    props.onChange(result.schema);
    props.onSelect(result.sectionId);
  }

  function handleRemove(section: SectionNode) {
    const nextSelectedId = getNextSelectedSectionId(
      props.schema,
      section.id,
      props.viewport,
    );

    Modal.confirm({
      cancelText: "Cancel",
      content: section.id,
      okText: "Delete",
      okType: "danger",
      onOk() {
        props.onChange(removeSection(props.schema, section.id));
        props.onSelect(nextSelectedId ?? "");
      },
      title: `Delete ${sectionLabel(section)}?`,
    });
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
      <div
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          Sections
        </Typography.Title>
        {props.viewport === "mobile" ? (
          <Space size={8} wrap>
            <Button
              icon={<CopyOutlined />}
              onClick={() =>
                props.onChange(copyDesktopSectionOrderToMobile(props.schema))
              }
              size="small"
            >
              Copy order
            </Button>
            <Button
              icon={<CopyOutlined />}
              onClick={() =>
                props.onChange(copyAllDesktopLayoutsToMobile(props.schema))
              }
              size="small"
            >
              Copy layouts
            </Button>
          </Space>
        ) : null}
      </div>
      {sections.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          dataSource={sections}
          renderItem={(section, index) => (
            <List.Item
              actions={[
                <Tooltip key="up" title="Move up">
                  <Button
                    aria-label={`Move ${sectionLabel(section)} up`}
                    disabled={index === 0}
                    icon={<ArrowUpOutlined />}
                    onClick={(event) => {
                      event.stopPropagation();
                      props.onChange(
                        moveSection(
                          props.schema,
                          section.id,
                          "up",
                          props.viewport,
                        ),
                      );
                    }}
                    size="small"
                  />
                </Tooltip>,
                <Tooltip key="down" title="Move down">
                  <Button
                    aria-label={`Move ${sectionLabel(section)} down`}
                    disabled={index === sections.length - 1}
                    icon={<ArrowDownOutlined />}
                    onClick={(event) => {
                      event.stopPropagation();
                      props.onChange(
                        moveSection(
                          props.schema,
                          section.id,
                          "down",
                          props.viewport,
                        ),
                      );
                    }}
                    size="small"
                  />
                </Tooltip>,
                <Tooltip key="duplicate" title="Duplicate">
                  <Button
                    aria-label={`Duplicate ${sectionLabel(section)}`}
                    icon={<CopyOutlined />}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDuplicate(section);
                    }}
                    size="small"
                  />
                </Tooltip>,
                <Tooltip key="delete" title="Delete">
                  <Button
                    aria-label={`Delete ${sectionLabel(section)}`}
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRemove(section);
                    }}
                    size="small"
                  />
                </Tooltip>,
              ]}
              onClick={() => props.onSelect(section.id)}
              style={{
                background:
                  props.selectedSectionId === section.id ? "#f0f5ff" : "#fff",
                cursor: "pointer",
              }}
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
