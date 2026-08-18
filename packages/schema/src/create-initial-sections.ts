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
    return [createPolicySection(input.title)];
  }

  if (normalizedSlug === "home" || normalizedSlug === "") {
    return input.homeSections;
  }

  return createNamedLandingSections(input.title, normalizedSlug);
}

function createPolicySection(title: string): SectionNode {
  return {
    id: "policy-body",
    component: "rich-text",
    layout: {
      desktop: { x: 0, y: 0, width: 1200 },
      mobile: { x: 0, y: 0, width: 390 },
    },
    props: {
      content: {
        defaultValue:
          "This page is a storefront placeholder. Publish a dedicated policy page to replace this content.",
      },
      title: { defaultValue: title },
    },
    visibility: { desktop: true, mobile: true },
  };
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
