import { FilterOutlined } from "@ant-design/icons";
import { Button } from "antd";

export function MissingTranslationKeyClearFilterButton(props: {
  isSelectingKey?: boolean;
  onClearFilters?: () => void;
}) {
  if (!props.onClearFilters) {
    return null;
  }

  return (
    <Button
      icon={<FilterOutlined />}
      loading={props.isSelectingKey}
      onClick={props.onClearFilters}
      size="small"
    >
      Clear filters
    </Button>
  );
}
