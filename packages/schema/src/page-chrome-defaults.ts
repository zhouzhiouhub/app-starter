export function createDefaultChromeBrand() {
  return {
    label: { defaultValue: "App Starter" },
    href: "/",
  };
}

export function createDefaultHeaderNavigation() {
  return [
    {
      id: "home",
      label: { defaultValue: "Home" },
      href: "/",
    },
    {
      id: "privacy",
      label: { defaultValue: "Privacy" },
      href: "/en/privacy",
    },
    {
      id: "terms",
      label: { defaultValue: "Terms" },
      href: "/en/terms",
    },
  ];
}

export function createDefaultLocaleSwitcher() {
  return {
    enabled: true,
    label: { defaultValue: "Language" },
    locales: [
      {
        code: "en-US",
        label: { defaultValue: "English" },
      },
    ],
  };
}

export function createDefaultHeaderChromeContent() {
  return {
    brand: createDefaultChromeBrand(),
    navigation: createDefaultHeaderNavigation(),
    localeSwitcher: createDefaultLocaleSwitcher(),
  };
}

export function createDefaultFooterNavigation() {
  return [
    {
      id: "privacy",
      label: { defaultValue: "Privacy" },
      href: "/en/privacy",
    },
    {
      id: "terms",
      label: { defaultValue: "Terms" },
      href: "/en/terms",
    },
    {
      id: "contact",
      label: { defaultValue: "Contact" },
      href: "/en/contact",
    },
  ];
}

export function createDefaultFooterCopyright() {
  return {
    defaultValue: "(c) 2026 App Starter. All rights reserved.",
  };
}

export function createDefaultFooterChromeContent() {
  return {
    brand: createDefaultChromeBrand(),
    copyright: createDefaultFooterCopyright(),
    navigation: createDefaultFooterNavigation(),
  };
}
