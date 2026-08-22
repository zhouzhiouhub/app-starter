import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { exampleLandingPage } from "@app-starter/schema";
import { pathToFileURL } from "node:url";

const DEFAULT_TENANT_SLUG = "default";
const DEFAULT_TENANT_NAME = "Default Tenant";
const DEFAULT_SITE_DOMAIN = "localhost";
const DEFAULT_SITE_NAME = "Default Site";
const DEFAULT_SEED_ADMIN_EMAIL = "admin@example.com";
const DEFAULT_SEED_ADMIN_PASSWORD = "ChangeMe123!";
const TENANT_ADMIN_ROLE = "tenant-admin";
const TENANT_ADMIN_PERMISSIONS = [
  "page:read",
  "page:write",
  "page:publish",
  "media:read",
  "media:write",
  "site:read",
  "site:write",
  "market:read",
  "locale:read",
  "locale:write",
  "translation:read",
  "product:read",
  "order:read",
  "audit:read",
];
const BCRYPT_COST = 12;

async function seed(prisma) {
  const adminCredentials = readSeedAdminCredentials();
  const tenant = await prisma.tenant.upsert({
    where: { slug: DEFAULT_TENANT_SLUG },
    update: { name: DEFAULT_TENANT_NAME },
    create: {
      name: DEFAULT_TENANT_NAME,
      slug: DEFAULT_TENANT_SLUG,
    },
  });

  const admin = await seedTenantAdmin(prisma, tenant.id, adminCredentials);

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

async function seedTenantAdmin(prisma, tenantId, credentials) {
  const { email, password } = credentials;
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

export function readSeedAdminCredentials(env = process.env) {
  const email = (
    env.SEED_ADMIN_EMAIL ?? DEFAULT_SEED_ADMIN_EMAIL
  ).trim().toLowerCase();
  const password = env.SEED_ADMIN_PASSWORD ?? DEFAULT_SEED_ADMIN_PASSWORD;

  if (!email || !password.trim()) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD cannot be empty.");
  }

  if (
    isProductionSeedEnvironment(env) &&
    (email === DEFAULT_SEED_ADMIN_EMAIL ||
      password === DEFAULT_SEED_ADMIN_PASSWORD)
  ) {
    throw new Error(
      "Production seed requires non-default SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD.",
    );
  }

  return { email, password };
}

function isProductionSeedEnvironment(env) {
  return [env.NODE_ENV, env.APP_ENV, env.VERCEL_ENV].some(
    (value) => value?.trim().toLowerCase() === "production",
  );
}

function isDirectExecution() {
  const entrypoint = process.argv[1];

  return Boolean(entrypoint && pathToFileURL(entrypoint).href === import.meta.url);
}

if (isDirectExecution()) {
  const prisma = new PrismaClient();

  seed(prisma)
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
}
