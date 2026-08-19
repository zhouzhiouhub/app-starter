import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AnalyticsScripts } from "./analytics-scripts";
import "./globals.css";

export const metadata: Metadata = {
  title: "App Starter",
  description: "Independent storefront platform"
};

export default function RootLayout(props: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {props.children}
        <AnalyticsScripts />
      </body>
    </html>
  );
}
