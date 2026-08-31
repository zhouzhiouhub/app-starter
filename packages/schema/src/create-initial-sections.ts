import type { SectionNode } from "./foundation.js";
import type { PageTemplateId } from "./page-template.js";

export function createInitialPageSections(input: {
  homeSections: SectionNode[];
  slug: string;
  title: string;
  templateId: PageTemplateId;
}): SectionNode[] {
  const normalizedSlug = input.slug.toLowerCase().replace(/^\/+|\/+$/g, "");

  if (input.templateId === "policy") {
    return [
      createPolicySection({
        normalizedSlug,
        title: input.title,
      }),
    ];
  }

  if (input.templateId === "system" || normalizedSlug === "404") {
    return createSystemPageSections(input.title);
  }

  if (normalizedSlug === "home" || normalizedSlug === "") {
    return input.homeSections;
  }

  return createNamedLandingSections(input.title, normalizedSlug);
}

function createPolicySection(input: {
  normalizedSlug: string;
  title: string;
}): SectionNode {
  const namespace = readPolicyTranslationNamespace(input.normalizedSlug);

  return {
    id: "policy-body",
    component: "rich-text",
    layout: {
      desktop: { x: 0, y: 0, width: 1200 },
      mobile: { x: 0, y: 0, width: 390 },
    },
    props: {
      content: {
        defaultValue: readPolicyContent(input.normalizedSlug),
        i18nKey: `${namespace}.content`,
      },
      title: {
        defaultValue: input.title,
        i18nKey: `${namespace}.title`,
      },
    },
    visibility: { desktop: true, mobile: true },
  };
}

function readPolicyTranslationNamespace(normalizedSlug: string): string {
  const leafSlug = readLeafSlug(normalizedSlug);

  if (leafSlug === "privacy" || leafSlug === "privacy-policy") {
    return "page.privacy";
  }

  if (leafSlug === "terms" || leafSlug === "terms-of-service") {
    return "page.terms";
  }

  return "page.policy";
}

function readPolicyContent(normalizedSlug: string): string {
  const leafSlug = readLeafSlug(normalizedSlug);

  if (leafSlug === "privacy" || leafSlug === "privacy-policy") {
    return [
      "<h3>Information we collect</h3>",
      "<p>We collect information you choose to provide, basic account details, and storefront usage data needed to operate and improve the site.</p>",
      "<h3>How we use information</h3>",
      "<p>We use information to provide site features, respond to requests, secure the service, measure performance, and meet legal obligations.</p>",
      "<h3>Cookies and analytics</h3>",
      "<p>Analytics and marketing tools load only when they are enabled in site settings and allowed by the consent configuration.</p>",
      "<h3>Contact</h3>",
      "<p>Contact the site owner for privacy requests or questions about this policy.</p>",
    ].join("");
  }

  if (leafSlug === "terms" || leafSlug === "terms-of-service") {
    return [
      "<h3>Use of the site</h3>",
      "<p>Use this site only for lawful purposes and in a way that does not disrupt the service or misuse its content.</p>",
      "<h3>Content and availability</h3>",
      "<p>Site content may change over time. We aim to keep published information accurate, but availability and details can vary.</p>",
      "<h3>Third-party services</h3>",
      "<p>Some features may rely on configured hosting, media, analytics, or integration providers.</p>",
      "<h3>Contact</h3>",
      "<p>Contact the site owner with questions about these terms.</p>",
    ].join("");
  }

  return [
    "<h3>Policy</h3>",
    "<p>This page describes the site policy that applies to this storefront.</p>",
  ].join("");
}

function createSystemPageSections(title: string): SectionNode[] {
  return [
    {
      id: "system-hero",
      component: "hero-banner",
      layout: {
        desktop: { height: 520, width: 1200, x: 0, y: 0 },
        mobile: { height: 560, width: 390, x: 0, y: 0 },
      },
      props: {
        body: {
          i18nKey: "page.not-found.body",
          defaultValue:
            "The page you are looking for may have moved, expired, or never existed.",
        },
        ctaHref: "/",
        ctaLabel: "Go home",
        eyebrow: "404",
        title: { defaultValue: title, i18nKey: "page.not-found.title" },
      },
      visibility: { desktop: true, mobile: true },
    },
    {
      id: "system-copy",
      component: "rich-text",
      layout: {
        desktop: { width: 1200, x: 0, y: 520 },
        mobile: { width: 390, x: 0, y: 560 },
      },
      props: {
        content: {
          i18nKey: "page.not-found.content",
          defaultValue:
            "Use the navigation to continue browsing, or return to the homepage.",
        },
        title: {
          defaultValue: "Page not found",
          i18nKey: "page.not-found.heading",
        },
      },
      visibility: { desktop: true, mobile: true },
    },
  ];
}

function readLeafSlug(normalizedSlug: string): string {
  return normalizedSlug.split("/").filter(Boolean).pop() ?? normalizedSlug;
}

function createNamedLandingSections(
  title: string,
  slug: string,
): SectionNode[] {
  return [
    {
      id: "hero",
      component: "hero-banner",
      layout: {
        desktop: { height: 560, width: 1200, x: 0, y: 0 },
        mobile: { height: 620, width: 390, x: 0, y: 0 },
      },
      props: {
        body: {
          defaultValue: `This is the ${title} page. It is separate from Home — open /en/${slug} on the storefront after you publish.`,
        },
        ctaLabel: "Preview",
        eyebrow: "New page",
        title: { defaultValue: title },
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
            "Edit this copy in Admin, save a draft, then publish. The storefront home page stays at /en.",
        },
        title: { defaultValue: title },
      },
      visibility: { desktop: true, mobile: true },
    },
  ];
}
