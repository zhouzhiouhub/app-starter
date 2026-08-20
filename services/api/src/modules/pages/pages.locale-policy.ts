import { ConflictException } from "@nestjs/common";
import { apiErrorCodes, type PageSchema } from "@app-starter/schema";
import { isMultiLocaleEnabled } from "../../common/feature-flags.js";
import { readApiDefaultLocale } from "../../common/runtime-defaults.js";

export function assertPageLocaleCanPublish(schema: PageSchema): void {
  const defaultLocale = readApiDefaultLocale();

  if (!isMultiLocaleEnabled() && schema.meta.locale !== defaultLocale) {
    throw new ConflictException({
      code: apiErrorCodes.MULTI_LOCALE_DISABLED,
      message: `Cannot publish locale ${schema.meta.locale} while multi-locale is disabled.`,
    });
  }
}
