import { lazy, Suspense } from "react";
import { ConfigProvider, Spin } from "antd";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { adminTheme } from "@app-starter/admin-theme";
import { AuthGate } from "./features/auth/components/auth-gate";

const AdminShell = lazy(() =>
  import("./features/shell/admin-shell").then((module) => ({
    default: module.AdminShell,
  })),
);
const DashboardPage = lazy(() =>
  import("./pages/dashboard/dashboard-page").then((module) => ({
    default: module.DashboardPage,
  })),
);
const LoginPage = lazy(() =>
  import("./pages/login/login-page").then((module) => ({
    default: module.LoginPage,
  })),
);
const PageEditorPage = lazy(() =>
  import("./pages/pages/page-editor-page").then((module) => ({
    default: module.PageEditorPage,
  })),
);
const PagesListPage = lazy(() =>
  import("./pages/pages/pages-list-page").then((module) => ({
    default: module.PagesListPage,
  })),
);
const PlaceholderPage = lazy(() =>
  import("./features/shell/placeholder-page").then((module) => ({
    default: module.PlaceholderPage,
  })),
);

function RouteLoadingFallback() {
  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        justifyContent: "center",
        minHeight: "100vh",
      }}
    >
      <Spin />
    </div>
  );
}

export function AdminApp() {
  return (
    <ConfigProvider theme={adminTheme}>
      <BrowserRouter>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route element={<LoginPage />} path="/login" />
            <Route
              element={
                <AuthGate>
                  <AdminShell />
                </AuthGate>
              }
            >
              <Route element={<DashboardPage />} path="/" />
              <Route element={<PagesListPage />} path="/pages" />
              <Route element={<PageEditorPage />} path="/pages/:pageId" />
              <Route
                element={
                  <PlaceholderPage
                    description="Media library and R2 uploads are not in this slice."
                    title="Media"
                  />
                }
                path="/media"
              />
              <Route
                element={
                  <PlaceholderPage
                    description="MVP keeps the default en-US locale. Market and translation admin comes later."
                    title="Localization"
                  />
                }
                path="/localization"
              />
              <Route
                element={
                  <PlaceholderPage
                    description="Site, domain, and integration settings are not in this slice."
                    title="Settings"
                  />
                }
                path="/settings"
              />
            </Route>
            <Route element={<Navigate replace to="/" />} path="*" />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ConfigProvider>
  );
}
