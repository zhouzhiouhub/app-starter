export type TranslationRecord = {
  context: string | null;
  key: string;
  locale: string;
  updatedAt: Date;
  value: string;
};

export function toTranslationResponse(record: TranslationRecord) {
  return {
    context: record.context,
    key: record.key,
    locale: record.locale,
    updatedAt: record.updatedAt.toISOString(),
    value: record.value,
  };
}
