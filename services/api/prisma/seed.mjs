import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { pathToFileURL } from "node:url";
import { seedDefaultPages } from "./seed-pages.mjs";

const DEFAULT_TENANT_SLUG = "default";
const DEFAULT_TENANT_NAME = "Default Tenant";
const DEFAULT_SITE_DOMAIN = "localhost";
const DEFAULT_SITE_NAME = "Default Site";
const DEFAULT_SEED_ADMIN_EMAIL = "admin@example.com";
const DEFAULT_SEED_ADMIN_PASSWORD = "ChangeMe123!";
const SEED_ADMIN_PASSWORD_MIN_LENGTH = 8;
const SEED_ADMIN_PASSWORD_MAX_LENGTH = 128;
const SEED_ADMIN_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
  "translation:write",
  "product:read",
  "product:write",
  "order:read",
  "payment:read",
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

  const pageIds = await seedDefaultPages(prisma, {
    authorId: admin.id,
    siteId: site.id,
  });

  return {
    adminEmail: admin.email,
    pageId: pageIds.home,
    pageIds,
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
  const email = (env.SEED_ADMIN_EMAIL ?? DEFAULT_SEED_ADMIN_EMAIL)
    .trim()
    .toLowerCase();
  const password = env.SEED_ADMIN_PASSWORD ?? DEFAULT_SEED_ADMIN_PASSWORD;

  if (!email || !password.trim()) {
    throw new Error(
      "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD cannot be empty.",
    );
  }

  if (!isSafeSeedAdminEmail(email)) {
    throw new Error("SEED_ADMIN_EMAIL must be a valid email address.");
  }

  if (!isSafeSeedAdminPassword(password)) {
    throw new Error(
      "SEED_ADMIN_PASSWORD must be 8 to 128 characters and cannot contain control characters.",
    );
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

function isSafeSeedAdminEmail(value) {
  return (
    value.length <= 254 &&
    SEED_ADMIN_EMAIL_PATTERN.test(value) &&
    !hasControlCharacter(value)
  );
}

function isSafeSeedAdminPassword(value) {
  return (
    value.length >= SEED_ADMIN_PASSWORD_MIN_LENGTH &&
    value.length <= SEED_ADMIN_PASSWORD_MAX_LENGTH &&
    !hasControlCharacter(value)
  );
}

function hasControlCharacter(value) {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0);

    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}

function isProductionSeedEnvironment(env) {
  return [env.NODE_ENV, env.APP_ENV, env.VERCEL_ENV].some(
    (value) => value?.trim().toLowerCase() === "production",
  );
}

function isDirectExecution() {
  const entrypoint = process.argv[1];

  return Boolean(
    entrypoint && pathToFileURL(entrypoint).href === import.meta.url,
  );
}

if (isDirectExecution()) {
  const prisma = new PrismaClient();

  seed(prisma)
    .then((result) => {
      const pages = Object.entries(result.pageIds)
        .map(([slug, pageId]) => `${slug}:${pageId}`)
        .join(",");
      console.log(
        `Seeded tenant=${result.tenantId} site=${result.siteId} pages=${pages} admin=${result.adminEmail}`,
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
