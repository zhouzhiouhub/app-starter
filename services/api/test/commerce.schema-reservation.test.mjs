import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const schemaPath = fileURLToPath(
  new URL("../prisma/schema.prisma", import.meta.url),
);
const migrationsPath = fileURLToPath(
  new URL("../prisma/migrations", import.meta.url),
);
const seedPath = fileURLToPath(new URL("../prisma/seed.mjs", import.meta.url));

const reservedCommerceModels = [
  "Market",
  "Product",
  "Variant",
  "Price",
  "Inventory",
  "Order",
  "OrderLine",
  "Payment",
  "WebhookEvent",
];

test("Prisma reserves the Phase 1 commerce data model without enabling writes", () => {
  const schema = readFileSync(schemaPath, "utf8");
  const seed = readFileSync(seedPath, "utf8");

  for (const model of reservedCommerceModels) {
    assert.equal(schema.includes(`model ${model} {`), true);
  }

  assertModelContains(schema, "Site", [
    "markets   Market[]",
    "orders    Order[]",
    "products  Product[]",
  ]);
  assertModelContains(schema, "Product", [
    "siteId",
    "media",
    "@@unique([siteId, slug])",
    "@@index([siteId, status])",
  ]);
  assertModelContains(schema, "Variant", [
    "productId",
    "@@unique([productId, sku])",
  ]);
  assertModelContains(schema, "Price", [
    "variantId",
    "marketId",
    "@@unique([variantId, marketId])",
  ]);
  assertModelContains(schema, "Inventory", [
    "quantity",
    "reserved",
    "@@unique([variantId, warehouseId])",
  ]);
  assertModelContains(schema, "Order", [
    "siteId",
    "marketId",
    "payment",
    "@@index([siteId, status, createdAt])",
  ]);
  assertModelContains(schema, "Payment", [
    "orderId    String   @unique",
    "@@index([provider, externalId])",
  ]);
  assertModelContains(schema, "WebhookEvent", [
    "tenantId    String?",
    "eventId     String    @unique",
    "processed   Boolean   @default(false)",
  ]);

  for (const delegate of [
    "market",
    "product",
    "variant",
    "price",
    "inventory",
    "order",
    "orderLine",
    "payment",
    "webhookEvent",
  ]) {
    assert.equal(
      seed.includes(`prisma.${delegate}`),
      false,
      `seed should not create ${delegate} data while commerce is disabled`,
    );
  }
});

test("commerce reservation migration creates the reserved tables and safety indexes", () => {
  const migrations = readMigrationSql();

  for (const table of reservedCommerceModels) {
    assert.match(migrations, new RegExp(`CREATE TABLE "${table}"`));
  }

  for (const index of [
    "Product_siteId_slug_key",
    "Variant_productId_sku_key",
    "Price_variantId_marketId_key",
    "Inventory_variantId_warehouseId_key",
    "Payment_orderId_key",
    "WebhookEvent_eventId_key",
    "Order_siteId_status_createdAt_idx",
  ]) {
    assert.match(migrations, new RegExp(`"${index}"`));
  }

  for (const constraint of [
    "Product_siteId_fkey",
    "Variant_productId_fkey",
    "Price_marketId_fkey",
    "Order_marketId_fkey",
    "OrderLine_variantId_fkey",
    "Payment_orderId_fkey",
    "WebhookEvent_tenantId_fkey",
  ]) {
    assert.match(migrations, new RegExp(`"${constraint}"`));
  }
});

function assertModelContains(schema, modelName, snippets) {
  const block = readModelBlock(schema, modelName);

  for (const snippet of snippets) {
    assert.equal(
      block.includes(snippet),
      true,
      `${modelName} should contain ${snippet}`,
    );
  }
}

function readModelBlock(schema, modelName) {
  const start = schema.indexOf(`model ${modelName} {`);

  assert.notEqual(start, -1, `${modelName} model should exist`);

  const end = schema.indexOf("\n}", start);

  assert.notEqual(end, -1, `${modelName} model should end`);

  return schema.slice(start, end);
}

function readMigrationSql() {
  return readdirSync(migrationsPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) =>
      readFileSync(join(migrationsPath, entry.name, "migration.sql"), "utf8"),
    )
    .join("\n");
}
