import {
  SafetyCertificateOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Card, Col, Descriptions, Row, Space, Statistic, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { ScopeGroupSummary, UserAccessSummary } from "../types";

export function UsersOverview(props: { summary: UserAccessSummary }) {
  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Row gutter={[16, 16]}>
        <Col md={8} xs={24}>
          <Card>
            <Statistic
              prefix={<UserOutlined />}
              title="Signed in"
              value={1}
            />
          </Card>
        </Col>
        <Col md={8} xs={24}>
          <Card>
            <Statistic
              prefix={<TeamOutlined />}
              title="Roles"
              value={props.summary.roleCount}
            />
          </Card>
        </Col>
        <Col md={8} xs={24}>
          <Card>
            <Statistic
              prefix={<SafetyCertificateOutlined />}
              title="Scopes"
              value={props.summary.scopeCount}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Account">
        <Descriptions
          column={1}
          items={[
            {
              children: props.summary.displayName,
              key: "name",
              label: "Name",
            },
            {
              children: props.summary.email,
              key: "email",
              label: "Email",
            },
            {
              children: props.summary.userId,
              key: "userId",
              label: "User ID",
            },
            {
              children: props.summary.tenantId,
              key: "tenantId",
              label: "Tenant",
            },
            {
              children: (
                <Space size="small" wrap>
                  {props.summary.roles.map((role) => (
                    <Tag color="blue" key={role}>
                      {role}
                    </Tag>
                  ))}
                </Space>
              ),
              key: "roles",
              label: "Roles",
            },
          ]}
        />
      </Card>

      <Card title="Permission Scopes">
        <Table<ScopeGroupSummary>
          columns={scopeGroupColumns}
          dataSource={props.summary.scopeGroups}
          pagination={false}
          rowKey="name"
        />
      </Card>
    </Space>
  );
}

const scopeGroupColumns: ColumnsType<ScopeGroupSummary> = [
  {
    dataIndex: "name",
    key: "name",
    title: "Group",
    width: 180,
  },
  {
    key: "scopes",
    render: (_, group) => (
      <Space size="small" wrap>
        {group.scopes.map((scope) => (
          <Tag key={scope}>{scope}</Tag>
        ))}
      </Space>
    ),
    title: "Scopes",
  },
];
