export function minimalPage(input = {}) {
  return {
    version: "1.0",
    meta: {
      locale: "en-US",
      market: "us",
      slug: "test-page",
      title: "Test page",
    },
    layout: { desktop: {}, mobile: {} },
    sections: [],
    seo: { title: "Test page", description: "" },
    ...input,
  };
}

export function section(id, component) {
  return {
    component,
    id,
    layout: {
      desktop: { width: 1200, x: 0, y: 0 },
      mobile: { width: 390, x: 0, y: 0 },
    },
    props: {},
  };
}
