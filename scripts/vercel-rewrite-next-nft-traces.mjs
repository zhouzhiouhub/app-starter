import { isAbsolute, join, relative, resolve, sep } from "node:path";

export function toPosixPath(filePath) {
  return filePath.split(sep).join("/");
}

export function isPathInside(filePath, parentDir) {
  const rel = relative(resolve(parentDir), resolve(filePath));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export function rewriteNftTracePath(
  file,
  originalDir,
  newDir,
  webNext,
  rootNext,
) {
  if (typeof file !== "string" || file.length === 0) {
    return file;
  }

  let absolute = resolve(originalDir, file);

  if (isPathInside(absolute, webNext)) {
    absolute = join(rootNext, relative(webNext, absolute));
  }

  return toPosixPath(relative(newDir, absolute));
}

export function rewriteNftTraceFiles(
  files,
  originalDir,
  newDir,
  webNext,
  rootNext,
) {
  if (!Array.isArray(files)) {
    return files;
  }

  return files.map((file) =>
    rewriteNftTracePath(file, originalDir, newDir, webNext, rootNext),
  );
}

export function rewriteNftDocument(
  document,
  originalDir,
  newDir,
  webNext,
  rootNext,
) {
  if (
    !document ||
    typeof document !== "object" ||
    !Array.isArray(document.files)
  ) {
    return document;
  }

  return {
    ...document,
    files: rewriteNftTraceFiles(
      document.files,
      originalDir,
      newDir,
      webNext,
      rootNext,
    ),
  };
}
