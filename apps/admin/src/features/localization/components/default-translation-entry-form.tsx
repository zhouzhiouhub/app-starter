import { SaveOutlined } from "@ant-design/icons";
import {
  Alert,
  AutoComplete,
  Button,
  Form,
  Input,
  Space,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import {
  publicTranslationMessageMaxLength,
  translationContextMaxLength,
  translationKeyMaxLength,
  translationKeyPattern,
} from "@app-starter/schema";
import { formatRequestError } from "../../../lib/api-error";
import { upsertDefaultTranslationEntry } from "../api";
import { formatDefaultTranslationSaveMessage } from "../translation-save-feedback";
import {
  createTranslationKeyDraft,
  readTranslationKeyOptions,
} from "../translation-key-draft";
import type { UpsertDefaultTranslationResult } from "../types";

interface TranslationEntryFormValues {
  context?: string;
  key: string;
  value: string;
}

export function DefaultTranslationEntryForm(props: {
  defaultLocale: string;
  draftKey?: string;
  draftVersion?: number;
  keyOptions?: string[];
  locateSavedEntry?: boolean;
  onSaved?: (result: UpsertDefaultTranslationResult) => Promise<void> | void;
}) {
  const [form] = Form.useForm<TranslationEntryFormValues>();
  const [feedback, setFeedback] = useState<{
    message: string;
    type: "error" | "success";
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const keyOptions = readTranslationKeyOptions(props.keyOptions ?? []);

  useEffect(() => {
    const draft = createTranslationKeyDraft(props.draftKey);

    if (!draft) {
      return;
    }

    form.setFieldsValue(draft);
    setFeedback(null);
  }, [form, props.draftKey, props.draftVersion]);

  function handleKeySelect(key: string) {
    const draft = createTranslationKeyDraft(key);

    if (draft) {
      form.setFieldsValue(draft);
    }
  }

  async function handleFinish(values: TranslationEntryFormValues) {
    setFeedback(null);
    setIsSaving(true);

    try {
      const result = await upsertDefaultTranslationEntry({
        context: readOptionalText(values.context),
        key: values.key,
        locale: props.defaultLocale,
        value: values.value,
      });
      await props.onSaved?.(result);
      form.resetFields();
      setFeedback({
        message: formatDefaultTranslationSaveMessage({
          locale: props.defaultLocale,
          result,
          willLocateEntry: props.locateSavedEntry,
        }),
        type: "success",
      });
    } catch (error) {
      setFeedback({
        message: formatRequestError(error),
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Typography.Title level={5}>Default locale entries</Typography.Title>
      {feedback ? (
        <Alert message={feedback.message} showIcon type={feedback.type} />
      ) : null}
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item
          label="Translation key"
          name="key"
          rules={[
            { required: true },
            { max: translationKeyMaxLength },
            {
              message: "Use lowercase dot-separated keys.",
              pattern: translationKeyPattern,
            },
          ]}
        >
          <AutoComplete
            filterOption={(inputValue, option) =>
              String(option?.value ?? "").includes(inputValue.trim())
            }
            onSelect={handleKeySelect}
            options={keyOptions}
            placeholder="page.home.hero.title"
          />
        </Form.Item>
        <Form.Item
          label={`Value (${props.defaultLocale})`}
          name="value"
          rules={[
            { required: true },
            { max: publicTranslationMessageMaxLength },
          ]}
        >
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} />
        </Form.Item>
        <Form.Item
          label="Context"
          name="context"
          rules={[{ max: translationContextMaxLength }]}
        >
          <Input placeholder="Homepage hero" />
        </Form.Item>
        <Button htmlType="submit" icon={<SaveOutlined />} loading={isSaving}>
          Save default translation
        </Button>
      </Form>
    </Space>
  );
}

function readOptionalText(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
