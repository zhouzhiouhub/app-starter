import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { exampleLandingPage } from "@app-starter/schema";

const DEFAULT_TENANT_SLUG = "default";
const DEFAULT_TENANT_NAME = "Default Tenant";
const DEFAULT_SITE_DOMAIN = "localhost";
const DEFAULT_SITE_NAME = "Default Site";
const TENANT_ADMIN_ROLE = "tenant-admin";
const TENANT_ADMIN_PERMISSIONS = [
  "page:read",
  "page:write",
  "page:publish",
  "market:read",
  "locale:read",
  "locale:write",
  "translation:read",
  "product:read",
  "order:read",
];
const BCRYPT_COST = 12;

const prisma = new PrismaClient();

async function seed() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: DEFAULT_TENANT_SLUG },
    update: { name: DEFAULT_TENANT_NAME },
    create: {
      name: DEFAULT_TENANT_NAME,
      slug: DEFAULT_TENANT_SLUG,
    },
  });

  const admin = await seedTenantAdmin(tenant.id);

  const site = await prisma.site.upsert({
    where: { domain: DEFAULT_SITE_DOMAIN },
    update: {
      name: DEFAULT_SITE_NAME,
      tenantId: tenant.id,
    },
    create: {
      name: DEFAULT_SITE_NAME,
      domain: DEFAULT_SITE_DOMAIN,
      tenantId: tenant.id,
    },
  });

  const existingPage = await prisma.page.findUnique({
    where: {
      siteId_slug: {
        siteId: site.id,
        slug: exampleLandingPage.meta.slug,
      },
    },
    include: {
      versions: {
        orderBy: { version: "desc" },
      },
    },
  });

  if (existingPage?.publishedVersionId) {
    return {
      adminEmail: admin.email,
      pageId: existingPage.id,
      siteId: site.id,
      tenantId: tenant.id,
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
        status: "draft",
      },
      include: {
        versions: {
          orderBy: { version: "desc" },
        },
      },
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
        authorId: admin.id,
        publishedAt: new Date(),
      },
    }));

  if (latestVersion && latestVersion.status !== "published") {
    await prisma.pageVersion.update({
      where: { id: latestVersion.id },
      data: {
        status: "published",
        authorId: admin.id,
        publishedAt: latestVersion.publishedAt ?? new Date(),
      },
    });
  }

  await prisma.page.update({
    where: { id: page.id },
    data: {
      status: "published",
      publishedVersionId: publishedVersion.id,
      title: exampleLandingPage.meta.title,
    },
  });

  return {
    adminEmail: admin.email,
    pageId: page.id,
    siteId: site.id,
    tenantId: tenant.id,
  };
}

async function seedTenantAdmin(tenantId) {
  const email = (
    process.env.SEED_ADMIN_EMAIL ?? "admin@example.com"
  ).trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const passwordHash = await hash(password, BCRYPT_COST);

  const role = await prisma.role.upsert({
    where: {
      tenantId_name: {
        tenantId,
        name: TENANT_ADMIN_ROLE,
      },
    },
    update: {
      permissions: TENANT_ADMIN_PERMISSIONS,
    },
    create: {
      tenantId,
      name: TENANT_ADMIN_ROLE,
      permissions: TENANT_ADMIN_PERMISSIONS,
    },
  });

  const user = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId,
        email,
      },
    },
    update: {
      name: "Tenant Admin",
      passwordHash,
      status: "active",
    },
    create: {
      tenantId,
      email,
      name: "Tenant Admin",
      passwordHash,
      status: "active",
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: role.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: role.id,
    },
  });

  return user;
}

seed()
  .then((result) => {
    console.log(
      `Seeded tenant=${result.tenantId} site=${result.siteId} page=${result.pageId} admin=${result.adminEmail}`,
    );
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
