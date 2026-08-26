import type { Prisma } from "@prisma/client";
import {
  collectPageTranslationKeys,
  translationMissingKeyPreviewMaxCount,
} from "@app-starter/schema";
import type { PrismaService } from "../prisma/prisma.service.js";

type TranslationCoverageClient = Pick<
  PrismaService,
  "page" | "pageVersion" | "translation"
>;

interface TranslationCoveragePageVersion {
  id: string;
  schema: Prisma.JsonValue;
}

export interface TranslationCoverageResult {
  expectedKeyCount: number;
  missingKeyCount: number;
  missingKeyPreviewLimit: number;
  missingKeys: string[];
}

export async function readTranslationCoverage(
  client: TranslationCoverageClient,
  input: {
    locale: string;
    namespace?: string;
    query?: string;
    tenantId: string;
  },
): Promise<TranslationCoverageResult> {
  const expectedKeys = filterTranslationKeys(
    await readExpectedTranslationKeys(client, input.tenantId),
    {
      namespace: input.namespace,
      query: input.query,
    },
  );
  const storedKeys = await readStoredTranslationKeys(client, {
    expectedKeys,
    locale: input.locale,
    tenantId: input.tenantId,
  });
  const missingKeys = expectedKeys.filter((key) => !storedKeys.has(key));

  return {
    expectedKeyCount: expectedKeys.length,
    missingKeyCount: missingKeys.length,
    missingKeyPreviewLimit: translationMissingKeyPreviewMaxCount,
    missingKeys: missingKeys.slice(0, translationMissingKeyPreviewMaxCount),
  };
}

async function readExpectedTranslationKeys(
  client: TranslationCoverageClient,
  tenantId: string,
): Promise<string[]> {
  const pageSchemas = await readPageTranslationSchemas(client, tenantId);
  const keys = new Set<string>();

  for (const schema of pageSchemas) {
    for (const key of collectPageTranslationKeys(schema)) {
      keys.add(key);
    }
  }

  return Array.from(keys).sort();
}

async function readPageTranslationSchemas(
  client: TranslationCoverageClient,
  tenantId: string,
): Promise<Prisma.JsonValue[]> {
  const pages = await client.page.findMany({
    select: {
      publishedVersionId: true,
      versions: {
        orderBy: { version: "desc" },
        select: {
          id: true,
          schema: true,
        },
        take: 1,
      },
    },
    where: {
      site: { tenantId },
    },
  });
  const versionsById = new Map<string, TranslationCoveragePageVersion>();

  for (const page of pages) {
    for (const version of page.versions) {
      versionsById.set(version.id, version);
    }
  }

  const publishedVersionIds = pages.flatMap((page) => {
    if (!page.publishedVersionId || versionsById.has(page.publishedVersionId)) {
      return [];
    }

    return [page.publishedVersionId];
  });

  if (publishedVersionIds.length > 0) {
    const publishedVersions = await client.pageVersion.findMany({
      select: {
        id: true,
        schema: true,
      },
      where: {
        id: { in: publishedVersionIds },
        page: {
          site: { tenantId },
        },
      },
    });

    for (const version of publishedVersions) {
      versionsById.set(version.id, version);
    }
  }

  return Array.from(versionsById.values()).map((version) => version.schema);
}

async function readStoredTranslationKeys(
  client: TranslationCoverageClient,
  input: {
    expectedKeys: string[];
    locale: string;
    tenantId: string;
  },
): Promise<Set<string>> {
  if (input.expectedKeys.length === 0) {
    return new Set();
  }

  const translations = await client.translation.findMany({
    select: { key: true },
    where: {
      key: { in: input.expectedKeys },
      locale: input.locale,
      tenantId: input.tenantId,
    },
  });

  return new Set(translations.map((translation) => translation.key));
}

function filterTranslationKeys(
  keys: string[],
  filters: { namespace?: string; query?: string },
): string[] {
  return keys.filter((key) => {
    if (
      filters.namespace &&
      key !== filters.namespace &&
      !key.startsWith(`${filters.namespace}.`)
    ) {
      return false;
    }

    return filters.query ? key.includes(filters.query) : true;
  });
}
