import { ConfigProvider } from "antd";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { adminTheme } from "@app-starter/admin-theme";
import { AuthGate } from "./features/auth/components/auth-gate";
import { AdminShell } from "./features/shell/admin-shell";
import { PlaceholderPage } from "./features/shell/placeholder-page";
import { DashboardPage } from "./pages/dashboard/dashboard-page";
import { LoginPage } from "./pages/login/login-page";
import { PageEditorPage } from "./pages/pages/page-editor-page";
import { PagesListPage } from "./pages/pages/pages-list-page";

export function AdminApp() {
  return (
    <ConfigProvider theme={adminTheme}>
      <BrowserRouter>
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
      </BrowserRouter>
    </ConfigProvider>
  );
}
