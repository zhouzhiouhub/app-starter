import {
  getStorefrontHref,
  localeCodeSchema,
  pageSlugSchema,
} from "@app-starter/schema";

export const storefrontPathUnavailableMessage =
  "Page slug or locale is invalid, so the storefront link cannot be built.";

export class AdminStorefrontPathError extends Error {
  constructor() {
    super(storefrontPathUnavailableMessage);
    this.name = "AdminStorefrontPathError";
  }
}

export type StorefrontPagePathResult =
  | {
      href: string;
      ok: true;
    }
  | {
      message: string;
      ok: false;
    };

export function getStorefrontPagePath(slug: string, locale = "en-US"): string {
  const path = readStorefrontPagePathParts(slug, locale);
  return getStorefrontHref(path.locale, path.slug);
}

export function readStorefrontPagePath(input: {
  locale?: string;
  slug: string;
}): StorefrontPagePathResult {
  try {
    return {
      href: getStorefrontPagePath(input.slug, input.locale),
      ok: true,
    };
  } catch (error) {
    if (error instanceof AdminStorefrontPathError) {
      return {
        message: storefrontPathUnavailableMessage,
        ok: false,
      };
    }

    throw error;
  }
}

function readStorefrontPagePathParts(slug: string, locale: string): {
  locale: string;
  slug: string;
} {
  const parsedSlug = pageSlugSchema.safeParse(slug);
  const parsedLocale = localeCodeSchema.safeParse(locale);

  if (!parsedSlug.success || !parsedLocale.success) {
    throw new AdminStorefrontPathError();
  }

  return {
    locale: parsedLocale.data,
    slug: parsedSlug.data,
  };
}
