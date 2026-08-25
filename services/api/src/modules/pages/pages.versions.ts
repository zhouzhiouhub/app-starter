import type { Prisma } from "@prisma/client";
import type { PageSchema } from "@app-starter/schema";
import type { PrismaService } from "../prisma/prisma.service.js";
import { nextVersionNumber } from "./pages.mapper.js";

const pageVersionSelect = {
  id: true,
  version: true,
  status: true,
  publishedAt: true,
  createdAt: true,
} as const;

export const pageVersionSummarySelect = {
  ...pageVersionSelect,
  authorId: true,
} as const;

export type PageVersionRecord = {
  id: string;
  version: number;
  status: string;
  authorId: string;
  publishedAt: Date | null;
  createdAt: Date;
};

export type PageVersionAuthor = {
  id: string;
  email: string;
  name: string | null;
};

export async function loadPageVersionAuthors(
  prisma: PrismaService,
  input: {
    tenantId: string;
    versions: Array<{ authorId: string }>;
  },
): Promise<Map<string, PageVersionAuthor>> {
  const authorIds = [
    ...new Set(input.versions.map((version) => version.authorId)),
  ];

  if (authorIds.length === 0) {
    return new Map();
  }

  const authors = await prisma.user.findMany({
    where: {
      id: { in: authorIds },
      tenantId: input.tenantId,
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  return new Map(authors.map((author) => [author.id, author]));
}

export function toPageVersionSummary(
  version: PageVersionRecord,
  author: PageVersionAuthor | undefined,
) {
  return {
    id: version.id,
    version: version.version,
    status: version.status,
    authorId: version.authorId,
    authorEmail: author?.email ?? null,
    authorName: author?.name ?? null,
    publishedAt: version.publishedAt?.toISOString() ?? null,
    createdAt: version.createdAt.toISOString(),
  };
}

export async function persistPublishedVersion(
  tx: Prisma.TransactionClient,
  input: {
    authorId: string;
    latest: { id: string; status: string; version: number } | undefined;
    pageId: string;
    schema: PageSchema;
  },
) {
  const schema = input.schema as unknown as Prisma.InputJsonValue;

  if (input.latest && input.latest.status !== "published") {
    return tx.pageVersion.update({
      where: { id: input.latest.id },
      data: {
        authorId: input.authorId,
        publishedAt: new Date(),
        schema,
        status: "published",
      },
      select: pageVersionSelect,
    });
  }

  return tx.pageVersion.create({
    data: {
      authorId: input.authorId,
      pageId: input.pageId,
      publishedAt: new Date(),
      schema,
      status: "published",
      version: nextVersionNumber(input.latest?.version),
    },
    select: pageVersionSelect,
  });
}

export async function persistRollbackVersion(
  tx: Prisma.TransactionClient,
  input: {
    authorId: string;
    latest: { version: number } | undefined;
    pageId: string;
    target: { schema: Prisma.JsonValue };
  },
) {
  return tx.pageVersion.create({
    data: {
      authorId: input.authorId,
      pageId: input.pageId,
      publishedAt: new Date(),
      schema: input.target.schema as Prisma.InputJsonValue,
      status: "published",
      version: nextVersionNumber(input.latest?.version),
    },
    select: pageVersionSelect,
  });
}
