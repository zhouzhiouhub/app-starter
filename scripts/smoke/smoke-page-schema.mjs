export function buildSmokePageSchema(input) {
  return {
    version: "1.0",
    meta: {
      slug: input.slug,
      title: input.title,
      market: input.market,
      locale: input.locale,
    },
    layout: {
      desktop: {},
      mobile: {},
    },
    template: {
      id: "landing-blank",
    },
    chrome: {
      header: {
        enabled: false,
        variant: "minimal",
      },
      footer: {
        enabled: false,
        variant: "minimal",
      },
    },
    sections: [
      {
        id: "hero",
        component: "hero-banner",
        layout: {
          desktop: { height: 560, width: 1200, x: 0, y: 0 },
          mobile: { height: 620, width: 390, x: 0, y: 0 },
        },
        props: {
          body: {
            defaultValue:
              "This page was published by the smoke test to verify the production publishing path.",
          },
          ctaLabel: "View",
          eyebrow: "Smoke test",
          title: { defaultValue: input.title },
        },
        visibility: { desktop: true, mobile: true },
      },
      {
        id: "copy",
        component: "rich-text",
        layout: {
          desktop: { width: 1200, x: 0, y: 560 },
          mobile: { width: 390, x: 0, y: 620 },
        },
        props: {
          content: {
            defaultValue:
              "The API publish route, public page endpoint, storefront renderer, and ISR revalidation are expected to work together.",
          },
          title: { defaultValue: "Publish chain verified" },
        },
        visibility: { desktop: true, mobile: true },
      },
    ],
    seo: {
      title: input.title,
      description: "Smoke test page for storefront publishing.",
    },
  };
}
