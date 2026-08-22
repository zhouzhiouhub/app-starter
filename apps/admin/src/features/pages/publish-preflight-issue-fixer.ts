import type { PageSchema } from "@app-starter/schema";
import type { PublishPreflightIssue } from "./publish-preflight";

export interface PublishPreflightIssueFixer {
  apply: (
    schema: PageSchema,
    issue: PublishPreflightIssue,
  ) => PageSchema | null;
  readLabel: (issue: PublishPreflightIssue) => string | null;
}
