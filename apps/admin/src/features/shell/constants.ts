export const adminMenuItems = [
  { key: "/", label: "Dashboard" },
  { key: "/pages", label: "Pages" },
  { key: "/design-system", label: "Design System" },
  { key: "/media", label: "Media" },
  { key: "/localization", label: "Localization" },
  { key: "/analytics", label: "Analytics" },
  { key: "/users", label: "Users" },
  { key: "/settings", label: "Settings" },
  { key: "/audit-logs", label: "Audit Logs" },
] as const;

export type AdminMenuKey = (typeof adminMenuItems)[number]["key"];

export function selectedAdminMenuKey(pathname: string): AdminMenuKey {
  if (pathname === "/") {
    return "/";
  }

  const match = adminMenuItems.find(
    (item) => item.key !== "/" && pathname.startsWith(item.key),
  );

  return match?.key ?? "/";
}

export function adminHeaderTitle(pathname: string): string {
  if (pathname.startsWith("/pages/") && pathname !== "/pages/") {
    return "Page Builder";
  }

  const selected = selectedAdminMenuKey(pathname);
  return adminMenuItems.find((item) => item.key === selected)?.label ?? "Admin";
}
