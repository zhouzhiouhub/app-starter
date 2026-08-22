export type PublishPreflightSeverity = "error" | "warning";

export interface PublishPreflightIssue {
  field: string;
  message: string;
  severity: PublishPreflightSeverity;
}
