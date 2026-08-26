import { ClearOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Form, Input, Space } from "antd";
import {
  translationNamespaceMaxLength,
  translationNamespacePattern,
  translationSearchMaxLength,
} from "@app-starter/schema";
import type { TranslationListFilters } from "../types";

interface TranslationListFilterValues {
  namespace?: string;
  query?: string;
}

export function TranslationListFilterBar(props: {
  filters: TranslationListFilters;
  isLoading?: boolean;
  onChange: (filters: TranslationListFilters) => void;
}) {
  const [form] = Form.useForm<TranslationListFilterValues>();
  const hasFilters = Boolean(props.filters.namespace || props.filters.query);

  function handleFinish(values: TranslationListFilterValues) {
    props.onChange({
      namespace: readOptionalText(values.namespace),
      query: readOptionalText(values.query),
    });
  }

  function handleReset() {
    form.setFieldsValue({ namespace: undefined, query: undefined });
    props.onChange({});
  }

  return (
    <Form
      form={form}
      initialValues={{
        namespace: props.filters.namespace,
        query: props.filters.query,
      }}
      layout="inline"
      onFinish={handleFinish}
    >
      <Form.Item
        label="Namespace"
        name="namespace"
        rules={[
          { max: translationNamespaceMaxLength },
          {
            message: "Use lowercase dot-separated namespace segments.",
            pattern: translationNamespacePattern,
          },
        ]}
      >
        <Input allowClear placeholder="page.home" />
      </Form.Item>
      <Form.Item
        label="Search"
        name="query"
        rules={[{ max: translationSearchMaxLength }]}
      >
        <Input allowClear placeholder="hero title" />
      </Form.Item>
      <Form.Item>
        <Space>
          <Button
            htmlType="submit"
            icon={<SearchOutlined />}
            loading={props.isLoading}
            type="primary"
          >
            Filter
          </Button>
          <Button
            disabled={!hasFilters || props.isLoading}
            icon={<ClearOutlined />}
            onClick={handleReset}
          >
            Clear
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
}

function readOptionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
