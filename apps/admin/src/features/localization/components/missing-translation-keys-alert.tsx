import { Alert, Typography } from "antd";
import type { LocalizationTranslationsMeta } from "../types";

export function MissingTranslationKeysAlert(props: {
  meta: LocalizationTranslationsMeta;
}) {
  if (props.meta.missingKeyCount === 0) {
    return null;
  }

  const preview = props.meta.missingKeys.join(", ");
  const suffix =
    props.meta.missingKeyCount > props.meta.missingKeyPreviewLimit
      ? ` Showing first ${props.meta.missingKeyPreviewLimit}.`
      : "";

  return (
    <Alert
      description={
        <Typography.Text code>
          {preview}
          {suffix}
        </Typography.Text>
      }
      message={`${props.meta.missingKeyCount} page translation keys are missing default ${props.meta.locale} entries.`}
      showIcon
      type="warning"
    />
  );
}
