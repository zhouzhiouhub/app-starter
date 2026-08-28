import { createFallbackPage, exampleLandingPage } from "@app-starter/schema";

const DEFAULT_SEED_PAGE_INPUTS = [
  {
    slug: "home",
    type: "landing",
    schema: exampleLandingPage,
  },
  {
    slug: "privacy",
    type: "policy",
    schema: createFallbackPage({ slug: "privacy" }),
  },
  {
    slug: "terms",
    type: "policy",
    schema: createFallbackPage({ slug: "terms" }),
  },
  {
    slug: "404",
    type: "system",
    schema: createFallbackPage({ slug: "404" }),
  },
];

export function createDefaultSeedPageDefinitions() {
  return DEFAULT_SEED_PAGE_INPUTS.map((input) => ({
    slug: input.slug,
    title: input.schema.meta.title,
    type: input.type,
    schema: input.schema,
  }));
}

export async function seedDefaultPages(prisma, input) {
  const pageIds = {};

  for (const definition of createDefaultSeedPageDefinitions()) {
    const page = await seedPublishedPage(prisma, {
      ...definition,
      authorId: input.authorId,
      siteId: input.siteId,
    });
    pageIds[definition.slug] = page.id;
  }

  return pageIds;
}

async function seedPublishedPage(prisma, input) {
  const existingPage = await prisma.page.findUnique({
    where: {
      siteId_slug: {
        siteId: input.siteId,
        slug: input.slug,
      },
    },
    include: {
      versions: {
        orderBy: { version: "desc" },
      },
    },
  });

  if (existingPage?.publishedVersionId) {
    return existingPage;
  }

  const page = existingPage ?? (await createDraftPage(prisma, input));
  const latestVersion = page.versions[0];
  const publishedVersion =
    latestVersion ?? (await createPublishedPageVersion(prisma, page.id, input));

  if (latestVersion && latestVersion.status !== "published") {
    await prisma.pageVersion.update({
      where: { id: latestVersion.id },
      data: {
        status: "published",
        authorId: input.authorId,
        publishedAt: latestVersion.publishedAt ?? new Date(),
      },
    });
  }

  return prisma.page.update({
    where: { id: page.id },
    data: {
      status: "published",
      publishedVersionId: publishedVersion.id,
      title: input.title,
      type: input.type,
    },
  });
}

function createDraftPage(prisma, input) {
  return prisma.page.create({
    data: {
      siteId: input.siteId,
      slug: input.slug,
      title: input.title,
      type: input.type,
      status: "draft",
    },
    include: {
      versions: {
        orderBy: { version: "desc" },
      },
    },
  });
}

function createPublishedPageVersion(prisma, pageId, input) {
  return prisma.pageVersion.create({
    data: {
      pageId,
      version: 1,
      schema: input.schema,
      status: "published",
      authorId: input.authorId,
      publishedAt: new Date(),
    },
  });
}
