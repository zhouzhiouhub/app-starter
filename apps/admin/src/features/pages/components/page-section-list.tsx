import { CopyOutlined } from "@ant-design/icons";
import { Button, Empty, List, Modal, Space, Typography } from "antd";
import {
  getOrderedSectionsForViewport,
  type PageSchema,
  type SectionNode,
  type Viewport,
} from "@app-starter/schema";
import { copyAllDesktopLayoutsToMobile } from "../section-layout-updates";
import {
  copyDesktopSectionOrderToMobile,
} from "../section-order-updates";
import { getSectionLabel } from "../section-label";
import {
  duplicateSection,
  getNextSelectedSectionId,
  removeSection,
} from "../section-management-updates";
import { PageSectionListItem } from "./page-section-list-item";

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
      title: `Delete ${getSectionLabel(section)}?`,
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
          renderItem={(section, index) =>
            <PageSectionListItem
              index={index}
              key={section.id}
              onDuplicate={handleDuplicate}
              onRemove={handleRemove}
              onSchemaChange={props.onChange}
              onSelect={props.onSelect}
              schema={props.schema}
              section={section}
              sectionCount={sections.length}
              selectedSectionId={props.selectedSectionId}
              viewport={props.viewport}
            />
          }
          size="small"
        />
      )}
    </section>
  );
}
