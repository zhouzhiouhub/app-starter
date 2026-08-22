import { useCallback } from "react";
import type { PageSchema } from "@app-starter/schema";
import type { PublishPreflightIssue } from "../publish-preflight";
import {
  applyPublishPreflightIssueFix,
  readPublishPreflightIssueFixLabel,
} from "../publish-preflight-issue-fix";

export function usePublishPreflightFix(input: {
  onChange: (schema: PageSchema) => void;
  schema: PageSchema;
}) {
  const { onChange, schema } = input;
  const handleIssueFix = useCallback(
    (issue: PublishPreflightIssue) => {
      const fixedSchema = applyPublishPreflightIssueFix(schema, issue);

      if (fixedSchema) {
        onChange(fixedSchema);
      }
    },
    [onChange, schema],
  );

  return {
    handleIssueFix,
    readIssueFixLabel: readPublishPreflightIssueFixLabel,
  };
}
