import type { Prisma } from "@prisma/client";

export function createTranslationWhere(input: {
  locale: string;
  namespace?: string;
  query?: string;
  tenantId: string;
}): Prisma.TranslationWhereInput {
  const filters: Prisma.TranslationWhereInput[] = [];

  if (input.namespace) {
    filters.push({
      OR: [
        { key: input.namespace },
        { key: { startsWith: `${input.namespace}.` } },
      ],
    });
  }

  if (input.query) {
    filters.push({
      OR: [
        { key: { contains: input.query } },
        { value: { contains: input.query } },
        { context: { contains: input.query } },
      ],
    });
  }

  return {
    ...(filters.length ? { AND: filters } : {}),
    locale: input.locale,
    tenantId: input.tenantId,
  };
}
