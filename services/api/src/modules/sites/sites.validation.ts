import { BadRequestException } from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";
import { z, ZodError } from "zod";

const siteDomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(255)
  .refine((value) => !/^https?:\/\//.test(value), {
    message: "Domain must not include a protocol.",
  })
  .refine((value) => !/[/?#\\\s]/.test(value), {
    message: "Domain must not include paths, query strings, or spaces.",
  })
  .refine(isAllowedHost, {
    message: "Domain must be a valid hostname.",
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

function isAllowedHost(value: string): boolean {
  const [host, port, extra] = value.split(":");

  if (!host || extra !== undefined) {
    return false;
  }

  if (port !== undefined && !isValidPort(port)) {
    return false;
  }

  return host === "localhost" || isValidHostname(host);
}

function isValidHostname(host: string): boolean {
  if (host.length > 253 || host.startsWith(".") || host.endsWith(".")) {
    return false;
  }

  return host.split(".").every((label) =>
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label),
  );
}

function isValidPort(value: string): boolean {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535;
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
