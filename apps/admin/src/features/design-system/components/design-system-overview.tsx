import {
  BgColorsOutlined,
  BlockOutlined,
  CodeOutlined,
} from "@ant-design/icons";
import { Card, Col, Descriptions, Row, Space, Statistic, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type {
  DesignSystemSummary,
  DesignSystemToken,
  DesignSystemTokenGroup,
} from "../types";

export function DesignSystemOverview(props: { summary: DesignSystemSummary }) {
  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Row gutter={[16, 16]}>
        <Col md={8} xs={24}>
          <Card>
            <Statistic
              prefix={<BlockOutlined />}
              title="Components"
              value={props.summary.componentCount}
            />
          </Card>
        </Col>
        <Col md={8} xs={24}>
          <Card>
            <Statistic
              prefix={<BgColorsOutlined />}
              title="Tokens"
              value={props.summary.tokenCount}
            />
          </Card>
        </Col>
        <Col md={8} xs={24}>
          <Card>
            <Statistic
              prefix={<CodeOutlined />}
              title="CSS variables"
              value={props.summary.cssVariableCount}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Component Registry">
        <Space size="small" wrap>
          {props.summary.componentIds.map((componentId) => (
            <Tag color="blue" key={componentId}>
              {componentId}
            </Tag>
          ))}
        </Space>
      </Card>

      <Card title="Design Tokens">
        <Table<DesignSystemTokenGroup>
          columns={tokenGroupColumns}
          dataSource={props.summary.tokenGroups}
          pagination={false}
          rowKey="key"
        />
      </Card>

      <Card title="Compiled Variables">
        <Descriptions
          column={1}
          items={props.summary.cssVariableNames.map((name) => ({
            children: <Tag>{name}</Tag>,
            key: name,
            label: name.replace("--", ""),
          }))}
        />
      </Card>
    </Space>
  );
}

const tokenGroupColumns: ColumnsType<DesignSystemTokenGroup> = [
  {
    dataIndex: "label",
    key: "label",
    title: "Group",
    width: 160,
  },
  {
    key: "count",
    render: (_, group) => group.tokens.length,
    title: "Count",
    width: 100,
  },
  {
    key: "tokens",
    render: (_, group) => <TokenList tokens={group.tokens} />,
    title: "Tokens",
  },
];

function TokenList(props: { tokens: DesignSystemToken[] }) {
  return (
    <Space size="small" wrap>
      {props.tokens.map((token) => (
        <Tag key={token.name}>
          <Space size={4}>
            {isColorValue(token.value) ? (
              <span
                aria-hidden
                style={{
                  background: token.value,
                  border: "1px solid #d9d9d9",
                  display: "inline-block",
                  height: 10,
                  width: 10,
                }}
              />
            ) : null}
            {token.name}: {token.value}
          </Space>
        </Tag>
      ))}
    </Space>
  );
}

function isColorValue(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}
