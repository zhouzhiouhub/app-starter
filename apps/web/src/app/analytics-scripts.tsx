import Script from "next/script";
import {
  readAnalyticsRuntimeConfig,
  shouldLoadAnalyticsScripts,
} from "../lib/analytics-config";

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
          <noscript>
            <iframe
              height="0"
              src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(
                config.gtmContainerId,
              )}`}
              style={{ display: "none", visibility: "hidden" }}
              title="Google Tag Manager"
              width="0"
            />
          </noscript>
        </>
      ) : null}
      {config.ga4MeasurementId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
              config.ga4MeasurementId,
            )}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-loader" strategy="afterInteractive">
            {createGa4Loader(config.ga4MeasurementId)}
          </Script>
        </>
      ) : null}
      {config.clarityProjectId ? (
        <Script id="clarity-loader" strategy="afterInteractive">
          {createClarityLoader(config.clarityProjectId)}
        </Script>
      ) : null}
    </>
  );
}

function createGtmLoader(containerId: string): string {
  const encodedContainerId = JSON.stringify(containerId);

  return `
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
    (function(w,d,s,l,i){
      var f=d.getElementsByTagName(s)[0];
      var j=d.createElement(s);
      var dl=l!="dataLayer"?"&l="+l:"";
      j.async=true;
      j.src="https://www.googletagmanager.com/gtm.js?id="+i+dl;
      f.parentNode.insertBefore(j,f);
    })(window,document,"script","dataLayer",${encodedContainerId});
  `;
}

function createGa4Loader(measurementId: string): string {
  const encodedMeasurementId = JSON.stringify(measurementId);

  return `
    window.dataLayer = window.dataLayer || [];
    function gtag(){window.dataLayer.push(arguments);}
    gtag("js", new Date());
    gtag("config", ${encodedMeasurementId}, { send_page_view: true });
  `;
}

function createClarityLoader(projectId: string): string {
  const encodedProjectId = JSON.stringify(projectId);

  return `
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);
      t.async=1;
      t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];
      y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", ${encodedProjectId});
  `;
}
