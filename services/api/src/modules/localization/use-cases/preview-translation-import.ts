import { apiErrorCodes } from "@app-starter/schema";
import { isMultiLocaleEnabled } from "../../../common/feature-flags.js";
import type { Actor } from "../../identity/identity.types.js";
import type { PrismaService } from "../../prisma/prisma.service.js";
import {
  parseTranslationImportPreviewEntry,
  parseTranslationImportPreviewInput,
  type TranslationImportPreviewEntry,
  type TranslationPreviewIssue,
} from "../localization.bulk-preview.validation.js";
import { readDefaultLocale } from "../localization.validation.js";

type ImportPreviewAction =
  "blocked" | "create" | "duplicate" | "error" | "update";
type ResolvedTranslationImportPreviewEntry = TranslationImportPreviewEntry & {
  locale: string;
};

interface ImportPreviewRow {
  action: ImportPreviewAction;
  index: number;
  issues: TranslationPreviewIssue[];
  key?: string;
  locale?: string;
}

export async function previewTranslationImport(
  prisma: PrismaService,
  body: unknown,
  actor: Actor,
  requestId = "local-dev",
) {
  const input = parseTranslationImportPreviewInput(body);
  const defaultLocale = readDefaultLocale();
  const parsedRows = input.entries.map((entry, index) =>
    readParsedImportRow(entry, index, defaultLocale),
  );
  const eligibleRows = parsedRows.filter(
    (
      row,
    ): row is ImportPreviewRow & {
      data: ResolvedTranslationImportPreviewEntry;
    } => Boolean(row.data),
  );
  const storedKeys = await readStoredKeys(prisma, {
    rows: eligibleRows,
    tenantId: actor.tenantId,
  });
  const seenKeys = new Set<string>();
  const rows = parsedRows.map((row) =>
    finalizeImportPreviewRow(row, {
      isDuplicate: row.data
        ? seenKeys.has(createImportPreviewKey(row.data))
        : false,
      markSeen: () => {
        if (row.data) {
          seenKeys.add(createImportPreviewKey(row.data));
        }
      },
      storedKeys,
    }),
  );

  return {
    data: {
      entries: rows,
      summary: summarizeImportPreviewRows(rows),
    },
    meta: {
      requestId,
      tenantId: actor.tenantId,
      defaultLocale,
      multiLocaleEnabled: isMultiLocaleEnabled(),
      preview: true,
    },
  };
}

function readParsedImportRow(
  entry: unknown,
  index: number,
  defaultLocale: string,
): ImportPreviewRow & { data?: ResolvedTranslationImportPreviewEntry } {
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
    rows: Array<
      ImportPreviewRow & { data: ResolvedTranslationImportPreviewEntry }
    >;
    tenantId: string;
  },
): Promise<Set<string>> {
  const filters = input.rows.map((row) => ({
    key: row.data.key,
    locale: row.data.locale,
    tenantId: input.tenantId,
  }));
  const uniqueFilters = Array.from(
    new Map(
      filters.map((filter) => [createImportPreviewKey(filter), filter]),
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

  return new Set(translations.map(createImportPreviewKey));
}

function finalizeImportPreviewRow(
  row: ImportPreviewRow & { data?: ResolvedTranslationImportPreviewEntry },
  input: {
    isDuplicate: boolean;
    markSeen: () => void;
    storedKeys: Set<string>;
  },
): ImportPreviewRow {
  if (!row.data) {
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
    action: input.storedKeys.has(createImportPreviewKey(row.data))
      ? "update"
      : "create",
    index: row.index,
    issues: [],
    key: row.data.key,
    locale: row.data.locale,
  };
}

function summarizeImportPreviewRows(rows: ImportPreviewRow[]) {
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

function createImportPreviewKey(input: {
  key: string;
  locale: string;
}): string {
  return `${input.locale}:${input.key}`;
}
