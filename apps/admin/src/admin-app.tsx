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
const AuditLogsPage = lazy(() =>
  import("./pages/audit/audit-logs-page").then((module) => ({
    default: module.AuditLogsPage,
  })),
);
const LoginPage = lazy(() =>
  import("./pages/login/login-page").then((module) => ({
    default: module.LoginPage,
  })),
);
const LocalizationPage = lazy(() =>
  import("./pages/localization/localization-page").then((module) => ({
    default: module.LocalizationPage,
  })),
);
const MediaPage = lazy(() =>
  import("./pages/media/media-page").then((module) => ({
    default: module.MediaPage,
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
const SettingsPage = lazy(() =>
  import("./pages/settings/settings-page").then((module) => ({
    default: module.SettingsPage,
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
                element={<MediaPage />}
                path="/media"
              />
              <Route element={<LocalizationPage />} path="/localization" />
              <Route
                element={<SettingsPage />}
                path="/settings"
              />
              <Route element={<AuditLogsPage />} path="/audit-logs" />
            </Route>
            <Route element={<Navigate replace to="/" />} path="*" />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ConfigProvider>
  );
}
