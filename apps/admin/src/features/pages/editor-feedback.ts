import { formatRequestError } from "../../lib/api-error";
import type { EditorFeedback } from "./types";

export function readEditorErrorFeedback(error: unknown): EditorFeedback {
  return {
    message: formatRequestError(error),
    type: "error",
  };
}
