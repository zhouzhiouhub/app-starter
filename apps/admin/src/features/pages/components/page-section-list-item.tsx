import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CopyOutlined,
  DeleteOutlined,
  HolderOutlined,
} from "@ant-design/icons";
import { Button, List, Space, Tag, Tooltip, Typography } from "antd";
import type { PageSchema, SectionNode, Viewport } from "@app-starter/schema";
import { getSectionLabel } from "../section-label";
import { moveSection } from "../section-order-updates";

export function PageSectionListItem(props: {
  index: number;
  onDuplicate: (section: SectionNode) => void;
  onRemove: (section: SectionNode) => void;
  onSchemaChange: (schema: PageSchema) => void;
  onSelect: (sectionId: string) => void;
  schema: PageSchema;
  section: SectionNode;
  sectionCount: number;
  selectedSectionId: string | null;
  viewport: Viewport;
}) {
  const hidden = props.section.visibility?.[props.viewport] === false;
  const label = getSectionLabel(props.section);

  return (
    <List.Item
      actions={[
        <Tooltip key="up" title="Move up">
          <Button
            aria-label={`Move ${label} up`}
            disabled={props.index === 0}
            icon={<ArrowUpOutlined />}
            onClick={(event) => {
              event.stopPropagation();
              props.onSchemaChange(
                moveSection(
                  props.schema,
                  props.section.id,
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
            aria-label={`Move ${label} down`}
            disabled={props.index === props.sectionCount - 1}
            icon={<ArrowDownOutlined />}
            onClick={(event) => {
              event.stopPropagation();
              props.onSchemaChange(
                moveSection(
                  props.schema,
                  props.section.id,
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
            aria-label={`Duplicate ${label}`}
            icon={<CopyOutlined />}
            onClick={(event) => {
              event.stopPropagation();
              props.onDuplicate(props.section);
            }}
            size="small"
          />
        </Tooltip>,
        <Tooltip key="delete" title="Delete">
          <Button
            aria-label={`Delete ${label}`}
            danger
            icon={<DeleteOutlined />}
            onClick={(event) => {
              event.stopPropagation();
              props.onRemove(props.section);
            }}
            size="small"
          />
        </Tooltip>,
      ]}
      onClick={() => props.onSelect(props.section.id)}
      style={{
        background:
          props.selectedSectionId === props.section.id ? "#f0f5ff" : "#fff",
        cursor: "pointer",
        opacity: hidden ? 0.62 : 1,
      }}
    >
      <List.Item.Meta
        avatar={<HolderOutlined style={{ color: "#8c8c8c" }} />}
        description={props.section.component}
        title={
          <Space size={8}>
            <Typography.Text strong>
              {props.index + 1}. {label}
            </Typography.Text>
            <Typography.Text code>{props.section.id}</Typography.Text>
            {hidden ? <Tag color="default">Hidden</Tag> : null}
          </Space>
        }
      />
    </List.Item>
  );
}
