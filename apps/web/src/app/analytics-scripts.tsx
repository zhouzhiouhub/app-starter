import Script from "next/script";
import {
  createClarityLoader,
  createGa4Loader,
  createGtmLoader,
} from "../lib/analytics-loader";
import {
  readAnalyticsRuntimeConfig,
  shouldLoadAnalyticsScripts,
} from "../lib/analytics-config";
import { shouldRenderGtmNoScriptFallback } from "../lib/analytics-noscript-policy";

export function AnalyticsScripts() {
  const config = readAnalyticsRuntimeConfig();

  if (!shouldLoadAnalyticsScripts(config)) {
    return null;
  }

  return (
    <>
      {config.gtmContainerId ? (
        <>
          <Script id="gtm-loader" strategy="afterInteractive">
            {createGtmLoader(config.gtmContainerId)}
          </Script>
          {shouldRenderGtmNoScriptFallback() ? (
            <noscript>
              <iframe
                height="0"
                src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(
                  config.gtmContainerId,
                )}`}
                referrerPolicy="no-referrer"
                style={{ display: "none", visibility: "hidden" }}
                title="Google Tag Manager"
                width="0"
              />
            </noscript>
          ) : null}
        </>
      ) : null}
      {config.ga4MeasurementId ? (
        <Script id="ga4-loader" strategy="afterInteractive">
          {createGa4Loader(config.ga4MeasurementId)}
        </Script>
      ) : null}
      {config.clarityProjectId ? (
        <Script id="clarity-loader" strategy="afterInteractive">
          {createClarityLoader(config.clarityProjectId)}
        </Script>
      ) : null}
    </>
  );
}
