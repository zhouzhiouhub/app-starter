import {
  recordSmokeCheck,
  recordSmokeCheckFailure,
} from "./smoke-report.mjs";

export async function runSmokeStep(
  report,
  name,
  action,
  readDetails = () => ({}),
) {
  try {
    const result = await action();
    recordSmokeCheck(report, name, readDetails(result));
    return result;
  } catch (error) {
    recordSmokeCheckFailure(report, name, error);
    throw error;
  }
}
