export function createPublicPageSchema(
  slug,
  title,
  options = { locale: "en-US", market: "us", noIndex: false },
) {
  return {
    version: "1.0",
    meta: {
      slug,
      title,
      market: options.market ?? "us",
      locale: options.locale ?? "en-US",
    },
    layout: {
      desktop: {},
      mobile: {},
    },
    sections: [],
    seo: {
      description: "",
      noIndex: options.noIndex ?? false,
      title,
    },
  };
}

export function createPublicSite() {
  return {
    id: "site-1",
    tenantId: "tenant-1",
  };
}
