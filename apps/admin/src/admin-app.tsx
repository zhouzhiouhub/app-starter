import { ConfigProvider } from "antd";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { adminTheme } from "@app-starter/admin-theme";
import { App } from "./app";
import { AuthGate } from "./features/auth/components/auth-gate";
import { LoginPage } from "./pages/login/login-page";

export function AdminApp() {
  return (
    <ConfigProvider theme={adminTheme}>
      <BrowserRouter>
        <Routes>
          <Route element={<LoginPage />} path="/login" />
          <Route
            element={
              <AuthGate>
                <App />
              </AuthGate>
            }
            path="/"
          />
          <Route element={<Navigate replace to="/" />} path="*" />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}
