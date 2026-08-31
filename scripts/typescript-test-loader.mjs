import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const sourceExtensions = [".ts", ".tsx", ".js", ".jsx", ".mjs"];

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    const url = await resolveSourceSpecifier(specifier, context.parentURL);

    if (!url) {
      throw error;
    }

    return { shortCircuit: true, url };
  }
}

export async function load(url, context, nextLoad) {
  if (!url.startsWith("file:") || !isTypeScriptSource(url)) {
    return nextLoad(url, context);
  }

  const filePath = fileURLToPath(url);
  const source = await readFile(filePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      isolatedModules: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      moduleResolution:
        ts.ModuleResolutionKind.Bundler ?? ts.ModuleResolutionKind.NodeNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filePath,
  });

  return {
    format: "module",
    shortCircuit: true,
    source: output.outputText,
  };
}

async function resolveSourceSpecifier(specifier, parentURL) {
  if (!isRelativeOrAbsoluteSpecifier(specifier)) {
    return null;
  }

  const parent = parentURL
    ? new URL(parentURL)
    : pathToFileURL(`${process.cwd()}${path.sep}`);
  const baseUrl = new URL(specifier, parent);
  const basePath = fileURLToPath(baseUrl);
  const candidates = [
    basePath,
    ...sourceExtensions.map((extension) => `${basePath}${extension}`),
    ...sourceExtensions.map((extension) =>
      path.join(basePath, `index${extension}`),
    ),
  ];

  for (const candidate of candidates) {
    if (await isFile(candidate)) {
      return pathToFileURL(candidate).href;
    }
  }

  return null;
}

function isRelativeOrAbsoluteSpecifier(specifier) {
  return (
    specifier.startsWith("./") ||
    specifier.startsWith("../") ||
    specifier.startsWith("/") ||
    specifier.startsWith("file:")
  );
}

function isTypeScriptSource(url) {
  const { pathname } = new URL(url);

  return pathname.endsWith(".ts") || pathname.endsWith(".tsx");
}

async function isFile(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}
