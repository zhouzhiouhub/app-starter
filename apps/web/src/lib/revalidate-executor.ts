export type RevalidateExecutor = (target: string) => void;

export type RevalidateExecutionFailure = {
  target: string;
  targetType: "path" | "tag";
};

export type RevalidateExecutionResult =
  | {
      ok: true;
    }
  | {
      error: RevalidateExecutionFailure;
      ok: false;
    };

export function runRevalidationOperations(input: {
  paths: string[];
  revalidatePath: RevalidateExecutor;
  revalidateTag: RevalidateExecutor;
  tags: string[];
}): RevalidateExecutionResult {
  for (const tag of input.tags) {
    try {
      input.revalidateTag(tag);
    } catch {
      return {
        error: {
          target: tag,
          targetType: "tag",
        },
        ok: false,
      };
    }
  }

  for (const path of input.paths) {
    try {
      input.revalidatePath(path);
    } catch {
      return {
        error: {
          target: path,
          targetType: "path",
        },
        ok: false,
      };
    }
  }

  return { ok: true };
}
