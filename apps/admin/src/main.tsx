import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AdminApp } from "./admin-app";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>
);
