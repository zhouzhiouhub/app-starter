import { apiErrorCodes } from "@app-starter/schema";
import { isMultiLocaleEnabled } from "../../common/feature-flags.js";
import type { Actor } from "../identity/identity.types.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import {
  parseTranslationImportPreviewEntry,
  parseTranslationImportPreviewInput,
  type TranslationImportPreviewEntry as ParsedTranslationImportEntry,
  type TranslationPreviewIssue,
} from "./localization.bulk-preview.validation.js";
import { readDefaultLocale } from "./localization.validation.js";

export type TranslationImportAction =
  "blocked" | "create" | "duplicate" | "error" | "update";
export type WritableTranslationImportAction = "create" | "update";

export type ResolvedTranslationImportEntry = ParsedTranslationImportEntry & {
  locale: string;
};

export interface TranslationImportPlanRow {
  action: TranslationImportAction;
  data?: ResolvedTranslationImportEntry;
  index: number;
  issues: TranslationPreviewIssue[];
  key?: string;
  locale?: string;
}

export interface TranslationImportPlanSummary {
  blockedCount: number;
  createCount: number;
  duplicateCount: number;
  errorCount: number;
  totalEntries: number;
  updateCount: number;
}

export interface TranslationImportPlan {
  defaultLocale: string;
  multiLocaleEnabled: boolean;
  rows: TranslationImportPlanRow[];
  summary: TranslationImportPlanSummary;
}

export type TranslationImportResponseRow = Omit<
  TranslationImportPlanRow,
  "data"
>;

export async function createTranslationImportPlan(
  prisma: PrismaService,
  body: unknown,
  actor: Actor,
): Promise<TranslationImportPlan> {
  const input = parseTranslationImportPreviewInput(body);
  const defaultLocale = readDefaultLocale();
  const parsedRows = input.entries.map((entry, index) =>
    readParsedImportRow(entry, index, defaultLocale),
  );
  const storedKeys = await readStoredKeys(prisma, {
    rows: parsedRows,
    tenantId: actor.tenantId,
  });
  const seenKeys = new Set<string>();
  const rows = parsedRows.map((row) =>
    finalizeImportPlanRow(row, {
      isDuplicate: row.data
        ? seenKeys.has(createImportPlanKey(row.data))
        : false,
      markSeen: () => {
        if (row.data) {
          seenKeys.add(createImportPlanKey(row.data));
        }
      },
      storedKeys,
    }),
  );

  return {
    defaultLocale,
    multiLocaleEnabled: isMultiLocaleEnabled(),
    rows,
    summary: summarizeImportPlanRows(rows),
  };
}

export function toTranslationImportResponseRow(
  row: TranslationImportPlanRow,
): TranslationImportResponseRow {
  return {
    action: row.action,
    index: row.index,
    issues: row.issues,
    key: row.key,
    locale: row.locale,
  };
}

function readParsedImportRow(
  entry: unknown,
  index: number,
  defaultLocale: string,
): TranslationImportPlanRow {
  const parsed = parseTranslationImportPreviewEntry(entry);

  if (!parsed.data) {
    return {
      action: "error",
      index,
      issues: parsed.issues,
    };
  }

  const locale = parsed.data.locale ?? defaultLocale;

  if (!isMultiLocaleEnabled() && locale !== defaultLocale) {
    return {
      action: "blocked",
      index,
      issues: [
        {
          code: apiErrorCodes.MULTI_LOCALE_DISABLED,
          field: "locale",
          message:
            "Cannot import non-default Locale translations while multi-locale is disabled.",
        },
      ],
      key: parsed.data.key,
      locale,
    };
  }

  return {
    action: "create",
    data: { ...parsed.data, locale },
    index,
    issues: [],
    key: parsed.data.key,
    locale,
  };
}

async function readStoredKeys(
  prisma: PrismaService,
  input: {
    rows: TranslationImportPlanRow[];
    tenantId: string;
  },
): Promise<Set<string>> {
  const filters = input.rows.filter(hasWritableData).map((row) => ({
    key: row.data.key,
    locale: row.data.locale,
    tenantId: input.tenantId,
  }));
  const uniqueFilters = Array.from(
    new Map(
      filters.map((filter) => [createImportPlanKey(filter), filter]),
    ).values(),
  );

  if (uniqueFilters.length === 0) {
    return new Set();
  }

  const translations = await prisma.translation.findMany({
    select: { key: true, locale: true },
    where: {
      OR: uniqueFilters,
    },
  });

  return new Set(translations.map(createImportPlanKey));
}

function finalizeImportPlanRow(
  row: TranslationImportPlanRow,
  input: {
    isDuplicate: boolean;
    markSeen: () => void;
    storedKeys: Set<string>;
  },
): TranslationImportPlanRow {
  if (!hasWritableData(row)) {
    return row;
  }

  if (input.isDuplicate) {
    return {
      action: "duplicate",
      index: row.index,
      issues: [
        {
          code: "DUPLICATE_TRANSLATION_KEY",
          field: "key",
          message: "Translation import contains the same key more than once.",
        },
      ],
      key: row.data.key,
      locale: row.data.locale,
    };
  }

  input.markSeen();

  return {
    ...row,
    action: input.storedKeys.has(createImportPlanKey(row.data))
      ? "update"
      : "create",
  };
}

function summarizeImportPlanRows(
  rows: TranslationImportPlanRow[],
): TranslationImportPlanSummary {
  return rows.reduce(
    (summary, row) => ({
      ...summary,
      blockedCount: summary.blockedCount + (row.action === "blocked" ? 1 : 0),
      createCount: summary.createCount + (row.action === "create" ? 1 : 0),
      duplicateCount:
        summary.duplicateCount + (row.action === "duplicate" ? 1 : 0),
      errorCount: summary.errorCount + (row.action === "error" ? 1 : 0),
      updateCount: summary.updateCount + (row.action === "update" ? 1 : 0),
    }),
    {
      blockedCount: 0,
      createCount: 0,
      duplicateCount: 0,
      errorCount: 0,
      totalEntries: rows.length,
      updateCount: 0,
    },
  );
}

function hasWritableData(
  row: TranslationImportPlanRow,
): row is TranslationImportPlanRow & {
  data: ResolvedTranslationImportEntry;
} {
  return Boolean(row.data);
}

function createImportPlanKey(input: { key: string; locale: string }): string {
  return `${input.locale}:${input.key}`;
}
