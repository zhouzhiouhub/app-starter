import { ConflictException } from "@nestjs/common";
import {
  apiErrorCodes,
  defaultRuntimeConfig,
  type PageSchema,
} from "@app-starter/schema";

export function assertPageLocaleCanPublish(schema: PageSchema): void {
  const defaultLocale =
    process.env.DEFAULT_LOCALE ?? defaultRuntimeConfig.defaultLocale;

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
