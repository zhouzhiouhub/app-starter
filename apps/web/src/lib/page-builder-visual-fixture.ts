import {
  getPageTemplateChrome,
  pageSchema,
  readMediaAssetId,
  type MediaAssetReference,
  type PageSchema,
  type SectionNode,
  type Viewport,
} from "@app-starter/schema";

export const pageBuilderVisualFixtureFlag =
  "ENABLE_VISUAL_ACCEPTANCE_FIXTURE";
export const pageBuilderVisualFixturePath = "/visual-acceptance";

export const pageBuilderVisualFixtureComponents = [
  "hero-banner",
  "rich-text",
  "image-gallery",
  "cta-bar",
  "faq",
  "spec-table",
] as const;

export type PageBuilderVisualFixtureComponent =
  (typeof pageBuilderVisualFixtureComponents)[number];

const fixtureMediaAssets: Readonly<Record<string, string>> = {
  "visual-gallery-a": "visual-gallery-a.svg",
  "visual-gallery-b": "visual-gallery-b.svg",
  "visual-gallery-c": "visual-gallery-c.svg",
};

export function isPageBuilderVisualFixtureEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env[pageBuilderVisualFixtureFlag] === "true";
}

export function readPageBuilderVisualFixtureViewport(
  value: string | string[] | undefined,
): Viewport {
  return value === "mobile" ? "mobile" : "desktop";
}

export function readPageBuilderVisualFixtureComponent(
  value: string | string[] | undefined,
): PageBuilderVisualFixtureComponent | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    return null;
  }

  return isPageBuilderVisualFixtureComponent(value) ? value : null;
}

export function createPageBuilderVisualFixtureSchema(input: {
  component?: PageBuilderVisualFixtureComponent;
} = {}): PageSchema {
  const sections = createFixtureSections(input.component);
  const sectionOrder = sections.map((section) => section.id);

  return pageSchema.parse({
    analytics: {
      dataLayerName: "dataLayer",
      enabled: false,
    },
    chrome: getPageTemplateChrome("landing-blank"),
    layout: {
      desktop: { sectionOrder },
      mobile: { sectionOrder },
    },
    meta: {
      locale: "en-US",
      market: "us",
      slug: "visual-acceptance",
      title: "Page Builder visual acceptance",
    },
    sections,
    seo: {
      description:
        "Internal fixture page for Page Builder visual acceptance screenshots.",
      noIndex: true,
      title: "Page Builder visual acceptance",
    },
    template: {
      id: "landing-blank",
    },
    version: "1.0",
  });
}

export function resolvePageBuilderVisualFixtureMediaUrl(
  reference: MediaAssetReference,
): string {
  const assetId = readMediaAssetId(reference);
  const assetName = assetId ? fixtureMediaAssets[assetId] : null;

  return `${pageBuilderVisualFixturePath}/assets/${
    assetName ?? "visual-gallery-missing.svg"
  }`;
}

function createFixtureSections(
  component?: PageBuilderVisualFixtureComponent,
): SectionNode[] {
  const sections = [
    createHeroSection(),
    createRichTextSection(),
    createImageGallerySection(),
    createCtaSection(),
    createFaqSection(),
    createSpecTableSection(),
  ];

  if (!component) {
    return sections;
  }

  const section = sections.find((item) => item.component === component);
  return section ? [moveSectionToTop(section)] : [];
}

function isPageBuilderVisualFixtureComponent(
  value: string,
): value is PageBuilderVisualFixtureComponent {
  return pageBuilderVisualFixtureComponents.some(
    (component) => component === value,
  );
}

function moveSectionToTop(section: SectionNode): SectionNode {
  return {
    ...section,
    layout: {
      desktop: section.layout.desktop
        ? { ...section.layout.desktop, y: 0 }
        : undefined,
      mobile: section.layout.mobile
        ? { ...section.layout.mobile, y: 0 }
        : undefined,
    },
  };
}

function createHeroSection(): SectionNode {
  return {
    component: "hero-banner",
    id: "visual-hero",
    layout: {
      desktop: { height: 560, width: 1200, x: 0, y: 0 },
      mobile: { height: 620, width: 390, x: 0, y: 0 },
    },
    props: {
      body: {
        defaultValue:
          "A controlled Page Schema scene for visual sign-off across desktop and mobile.",
      },
      ctaHref: "/en/visual-acceptance",
      ctaLabel: "Review fixture",
      eyebrow: "Visual acceptance",
      title: { defaultValue: "Page Builder core section fixture" },
    },
    visibility: { desktop: true, mobile: true },
  };
}

function createRichTextSection(): SectionNode {
  return {
    component: "rich-text",
    id: "visual-copy",
    layout: {
      desktop: { height: 320, width: 1200, x: 0, y: 560 },
      mobile: { height: 360, width: 390, x: 0, y: 620 },
    },
    props: {
      content: {
        defaultValue:
          "This fixture keeps copy, media, FAQ, CTA, and specification sections together so screenshots use the shared storefront renderer.",
      },
      title: { defaultValue: "Shared renderer, stable evidence" },
    },
    visibility: { desktop: true, mobile: true },
  };
}

function createImageGallerySection(): SectionNode {
  return {
    component: "image-gallery",
    id: "visual-gallery",
    layout: {
      desktop: { height: 380, width: 1200, x: 0, y: 880 },
      mobile: { height: 460, width: 390, x: 0, y: 980 },
    },
    props: {
      images: [
        {
          alt: "Warm product composition fixture",
          src: "media://visual-gallery-a",
        },
        {
          alt: "Blue product detail fixture",
          src: "media://visual-gallery-b",
        },
        {
          alt: "Green lifestyle fixture",
          src: "media://visual-gallery-c",
        },
      ],
    },
    visibility: { desktop: true, mobile: true },
  };
}

function createCtaSection(): SectionNode {
  return {
    component: "cta-bar",
    id: "visual-cta",
    layout: {
      desktop: { height: 190, width: 1200, x: 0, y: 1260 },
      mobile: { height: 230, width: 390, x: 0, y: 1440 },
    },
    props: {
      ctaHref: "/en/contact",
      ctaLabel: "Prepare release",
      title: { defaultValue: "Ready for final screenshot capture?" },
    },
    visibility: { desktop: true, mobile: true },
  };
}

function createFaqSection(): SectionNode {
  return {
    component: "faq",
    id: "visual-faq",
    layout: {
      desktop: { height: 360, width: 1200, x: 0, y: 1450 },
      mobile: { height: 440, width: 390, x: 0, y: 1670 },
    },
    props: {
      items: [
        {
          answer:
            "Use this route to capture browser screenshots after the fixture flag is enabled.",
          question: "What is this page for?",
        },
        {
          answer:
            "It renders the same Page Schema through the shared storefront renderer.",
          question: "Why is it reliable?",
        },
        {
          answer:
            "No. Final sign-off still needs design references and measured diff values.",
          question: "Does it replace visual comparison?",
        },
      ],
    },
    visibility: { desktop: true, mobile: true },
  };
}

function createSpecTableSection(): SectionNode {
  return {
    component: "spec-table",
    id: "visual-spec",
    layout: {
      desktop: { height: 360, width: 1200, x: 0, y: 1810 },
      mobile: { height: 430, width: 390, x: 0, y: 2110 },
    },
    props: {
      rows: [
        { label: "Viewport coverage", value: "Desktop and mobile" },
        { label: "Section coverage", value: "Six MVP core sections" },
        { label: "Renderer", value: "@app-starter/renderer" },
        { label: "Media", value: "media:// references resolved by fixture" },
      ],
    },
    visibility: { desktop: true, mobile: true },
  };
}
