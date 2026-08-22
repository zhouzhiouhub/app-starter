import { BadRequestException } from "@nestjs/common";
import {
  apiErrorCodes,
  normalizeSiteDomain,
  readSiteDomainIssue,
  readSiteDomainIssueMessage,
} from "@app-starter/schema";
import { z, ZodError } from "zod";

const siteDomainSchema = z
  .string()
  .transform(normalizeSiteDomain)
  .superRefine((value, context) => {
    const issue = readSiteDomainIssue(value);

    if (issue) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: readSiteDomainIssueMessage(issue),
      });
    }
  });

const updateSiteSettingsInputSchema = z
  .object({
    domain: siteDomainSchema.optional(),
    name: z.string().trim().min(1).max(120).optional(),
  })
  .refine((value) => value.name !== undefined || value.domain !== undefined, {
    message: "At least one setting must be provided.",
  });

export type UpdateSiteSettingsInput = z.infer<
  typeof updateSiteSettingsInputSchema
>;

export function parseUpdateSiteSettingsInput(
  body: unknown,
): UpdateSiteSettingsInput {
  return parseOrThrow(() =>
    updateSiteSettingsInputSchema.parse(unwrapBodyData(body)),
  );
}

function unwrapBodyData(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be an object.");
  }

  const record = body as Record<string, unknown>;
  const data = record.data ?? record;

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Request body data must be an object.");
  }

  return data as Record<string, unknown>;
}

function parseOrThrow<T>(fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof ZodError) {
      throw new BadRequestException({
        code: apiErrorCodes.VALIDATION_ERROR,
        message: error.issues[0]?.message ?? "Invalid request.",
        details: error.flatten(),
      });
    }

    if (error instanceof Error && error.message.startsWith("Request body")) {
      throw new BadRequestException({
        code: apiErrorCodes.VALIDATION_ERROR,
        message: error.message,
      });
    }

    throw error;
  }
}
