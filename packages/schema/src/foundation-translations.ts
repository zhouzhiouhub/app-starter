import { z } from "zod";

export const translationEntryMaxCount = 2_000;
export const translationListDefaultLimit = 20;
export const translationListMaxLimit = 100;
export const translationMissingKeyPreviewMaxCount = 50;
export const publicTranslationEntryMaxCount = translationEntryMaxCount;
export const publicTranslationKeyMaxLength = 256;
export const publicTranslationMessageMaxLength = 20_000;
export const translationKeyMaxLength = publicTranslationKeyMaxLength;
export const translationValueMaxLength = publicTranslationMessageMaxLength;
export const translationContextMaxLength = 512;
export const translationSearchMaxLength = 128;
export const translationNamespaceMaxLength = translationKeyMaxLength;
export const translationKeyPattern = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/;
export const translationNamespacePattern =
  /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)*$/;
export const translationKeySchema = z
  .string()
  .min(1)
  .max(translationKeyMaxLength)
  .regex(
    translationKeyPattern,
    "Translation key must use lowercase dot-separated segments.",
  );
export const translationNamespaceSchema = z
  .string()
  .min(1)
  .max(translationNamespaceMaxLength)
  .regex(
    translationNamespacePattern,
    "Translation namespace must use lowercase dot-separated segments.",
  );
export type TranslationKey = z.infer<typeof translationKeySchema>;
export type TranslationNamespace = z.infer<typeof translationNamespaceSchema>;
