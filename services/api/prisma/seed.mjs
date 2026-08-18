import { PrismaClient } from "@prisma/client";
import { exampleLandingPage } from "@app-starter/schema";

const DEFAULT_TENANT_SLUG = "default";
const DEFAULT_TENANT_NAME = "Default Tenant";
const DEFAULT_SITE_DOMAIN = "localhost";
const DEFAULT_SITE_NAME = "Default Site";
const SYSTEM_AUTHOR_ID = "00000000-0000-4000-8000-000000000001";

const prisma = new PrismaClient();

async function seed() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: DEFAULT_TENANT_SLUG },
    update: { name: DEFAULT_TENANT_NAME },
    create: {
      name: DEFAULT_TENANT_NAME,
      slug: DEFAULT_TENANT_SLUG
    }
  });

  const site = await prisma.site.upsert({
    where: { domain: DEFAULT_SITE_DOMAIN },
    update: {
      name: DEFAULT_SITE_NAME,
      tenantId: tenant.id
    },
    create: {
      name: DEFAULT_SITE_NAME,
      domain: DEFAULT_SITE_DOMAIN,
      tenantId: tenant.id
    }
  });

  const existingPage = await prisma.page.findUnique({
    where: {
      siteId_slug: {
        siteId: site.id,
        slug: exampleLandingPage.meta.slug
      }
    },
    include: {
      versions: {
        orderBy: { version: "desc" }
      }
    }
  });

  if (existingPage?.publishedVersionId) {
    return {
      siteId: site.id,
      tenantId: tenant.id,
      pageId: existingPage.id
    };
  }

  const page =
    existingPage ??
    (await prisma.page.create({
      data: {
        siteId: site.id,
        slug: exampleLandingPage.meta.slug,
        title: exampleLandingPage.meta.title,
        type: "landing",
        status: "draft"
      },
      include: {
        versions: {
          orderBy: { version: "desc" }
        }
      }
    }));

  const latestVersion = page.versions[0];
  const publishedVersion =
    latestVersion ??
    (await prisma.pageVersion.create({
      data: {
        pageId: page.id,
        version: 1,
        schema: exampleLandingPage,
        status: "published",
        authorId: SYSTEM_AUTHOR_ID,
        publishedAt: new Date()
      }
    }));

  if (latestVersion && latestVersion.status !== "published") {
    await prisma.pageVersion.update({
      where: { id: latestVersion.id },
      data: {
        status: "published",
        publishedAt: latestVersion.publishedAt ?? new Date()
      }
    });
  }

  await prisma.page.update({
    where: { id: page.id },
    data: {
      status: "published",
      publishedVersionId: publishedVersion.id,
      title: exampleLandingPage.meta.title
    }
  });

  return {
    siteId: site.id,
    tenantId: tenant.id,
    pageId: page.id
  };
}

seed()
  .then((result) => {
    console.log(
      `Seeded tenant=${result.tenantId} site=${result.siteId} page=${result.pageId}`
    );
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
