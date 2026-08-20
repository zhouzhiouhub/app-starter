import { ConflictException } from "@nestjs/common";
import { apiErrorCodes, type PageSchema } from "@app-starter/schema";
import { readApiDefaultLocale } from "../../common/runtime-defaults.js";

export function assertPageLocaleCanPublish(schema: PageSchema): void {
  const defaultLocale = readApiDefaultLocale();

  if (
    process.env.MULTI_LOCALE_ENABLED !== "true" &&
    schema.meta.locale !== defaultLocale
  ) {
    throw new ConflictException({
      code: apiErrorCodes.MULTI_LOCALE_DISABLED,
      message: `Cannot publish locale ${schema.meta.locale} while multi-locale is disabled.`,
    });
  }
}
