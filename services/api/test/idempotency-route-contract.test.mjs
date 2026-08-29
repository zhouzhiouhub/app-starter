import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const modulesRoot = path.join(repositoryRoot, "services/api/src/modules");
const writeRouteDecorators = new Set(["Delete", "Patch", "Post", "Put"]);
const allowedNonIdempotentWriteRoutes = new Set([
  "services/api/src/modules/commerce/stripe-webhook.controller.ts#receiveStripeWebhook:Post",
  "services/api/src/modules/identity/identity.controller.ts#login:Post",
  "services/api/src/modules/identity/identity.controller.ts#logout:Post",
  "services/api/src/modules/identity/identity.controller.ts#refresh:Post",
  "services/api/src/modules/localization/localization.controller.ts#createTranslationExport:Post",
  "services/api/src/modules/localization/localization.controller.ts#previewTranslationExport:Post",
  "services/api/src/modules/localization/localization.controller.ts#previewTranslationImport:Post",
]);

test("business write routes require Idempotency-Key headers", () => {
  const routes = readControllerWriteRoutes();
  const violations = routes
    .filter((route) => !allowedNonIdempotentWriteRoutes.has(route.id))
    .filter((route) => !route.hasIdempotencyHeader || !route.validatesIdempotency)
    .map((route) => {
      const missing = [
        route.hasIdempotencyHeader ? null : '@Headers("idempotency-key")',
        route.validatesIdempotency ? null : "requireIdempotencyKey(...)",
      ].filter(Boolean);

      return `${route.id} missing ${missing.join(" and ")}`;
    });

  assert.deepEqual(violations, []);
});

test("business write route Idempotency-Key exception list stays explicit", () => {
  const routeIds = new Set(readControllerWriteRoutes().map((route) => route.id));
  const staleExceptions = [...allowedNonIdempotentWriteRoutes].filter(
    (routeId) => !routeIds.has(routeId),
  );

  assert.deepEqual(staleExceptions, []);
});

function readControllerWriteRoutes() {
  return readControllerFiles(modulesRoot).flatMap(readControllerFileWriteRoutes);
}

function readControllerFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return readControllerFiles(fullPath);
    }

    return entry.isFile() && entry.name.endsWith(".controller.ts")
      ? [fullPath]
      : [];
  });
}

function readControllerFileWriteRoutes(filePath) {
  const source = readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const routes = [];

  function visit(node) {
    if (ts.isMethodDeclaration(node)) {
      routes.push(
        ...readWriteRouteDecorators(node).map((verb) =>
          createRouteContract(filePath, sourceFile, node, verb),
        ),
      );
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return routes;
}

function createRouteContract(filePath, sourceFile, method, verb) {
  const methodName = method.name.getText(sourceFile);
  const relativePath = path
    .relative(repositoryRoot, filePath)
    .replaceAll(path.sep, "/");

  return {
    hasIdempotencyHeader: hasIdempotencyKeyHeader(method),
    id: `${relativePath}#${methodName}:${verb}`,
    validatesIdempotency: callsRequireIdempotencyKey(method),
  };
}

function readWriteRouteDecorators(method) {
  return readDecorators(method)
    .map(readDecoratorCalleeName)
    .filter((name) => writeRouteDecorators.has(name));
}

function hasIdempotencyKeyHeader(method) {
  return method.parameters.some((parameter) =>
    readDecorators(parameter).some(isIdempotencyKeyHeaderDecorator),
  );
}

function isIdempotencyKeyHeaderDecorator(decorator) {
  const expression = decorator.expression;

  return (
    ts.isCallExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === "Headers" &&
    expression.arguments.some(
      (argument) =>
        ts.isStringLiteral(argument) &&
        argument.text.toLowerCase() === "idempotency-key",
    )
  );
}

function callsRequireIdempotencyKey(method) {
  let found = false;

  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "requireIdempotencyKey"
    ) {
      found = true;
      return;
    }

    ts.forEachChild(node, visit);
  }

  visit(method);
  return found;
}

function readDecorators(node) {
  return ts.canHaveDecorators(node) ? ts.getDecorators(node) ?? [] : [];
}

function readDecoratorCalleeName(decorator) {
  const expression = decorator.expression;

  if (!ts.isCallExpression(expression) || !ts.isIdentifier(expression.expression)) {
    return null;
  }

  return expression.expression.text;
}
