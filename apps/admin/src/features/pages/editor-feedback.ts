import {
  ApiRequestError,
  formatRequestError,
} from "../../lib/api-error.ts";
import type { EditorFeedback } from "./types";

export function readEditorErrorFeedback(error: unknown): EditorFeedback {
  const message = formatRequestError(error);

  return {
    message:
      error instanceof ApiRequestError
        ? `API rejected the request. ${message}`
        : message,
    type: "error",
  };
}
