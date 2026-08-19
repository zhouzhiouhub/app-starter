import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Form, Input, Select, Space } from "antd";
import { auditActionOptions } from "../constants";
import type { AuditLogFilters } from "../types";

export function AuditLogFiltersBar(props: {
  filters: AuditLogFilters;
  onChange: (filters: AuditLogFilters) => void;
}) {
  const [form] = Form.useForm<AuditLogFilters>();

  return (
    <Form
      form={form}
      initialValues={props.filters}
      layout="inline"
      onFinish={(values) => props.onChange(compactFilters(values))}
    >
      <Form.Item name="action">
        <Select
          allowClear
          options={auditActionOptions}
          placeholder="Action"
          style={{ width: 220 }}
        />
      </Form.Item>
      <Form.Item name="targetType">
        <Input placeholder="Target type" style={{ width: 140 }} />
      </Form.Item>
      <Form.Item name="targetId">
        <Input placeholder="Target ID" style={{ width: 220 }} />
      </Form.Item>
      <Form.Item name="actorId">
        <Input placeholder="Actor ID" style={{ width: 220 }} />
      </Form.Item>
      <Form.Item>
        <Space>
          <Button htmlType="submit" icon={<SearchOutlined />} type="primary">
            Search
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              form.resetFields();
              props.onChange({});
            }}
          >
            Reset
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
}

function compactFilters(filters: AuditLogFilters): AuditLogFilters {
  return Object.fromEntries(
    Object.entries(filters)
      .map(([key, value]) => [key, value?.trim()])
      .filter(([, value]) => Boolean(value)),
  );
}
