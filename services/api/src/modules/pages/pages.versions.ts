import type { Prisma } from "@prisma/client";
import type { PageSchema } from "@app-starter/schema";
import { nextVersionNumber } from "./pages.mapper.js";

const pageVersionSelect = {
  id: true,
  version: true,
  status: true,
  publishedAt: true,
  createdAt: true,
} as const;

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
