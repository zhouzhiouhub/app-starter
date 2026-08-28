const analyticsExcludedPathnames = ["/preview", "/visual-acceptance"];

export function createGtmLoader(containerId: string): string {
  const encodedContainerId = JSON.stringify(containerId);

  return `
    (function(w,d,s,l,i){
      ${createAnalyticsRouteGuard("w")}
      w.dataLayer = w.dataLayer || [];
      w.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
      var f=d.getElementsByTagName(s)[0];
      var j=d.createElement(s);
      var dl=l!="dataLayer"?"&l="+l:"";
      j.async=true;
      j.src="https://www.googletagmanager.com/gtm.js?id="+encodeURIComponent(i)+dl;
      f.parentNode.insertBefore(j,f);
    })(window,document,"script","dataLayer",${encodedContainerId});
  `;
}

export function createGa4Loader(measurementId: string): string {
  const encodedMeasurementId = JSON.stringify(measurementId);

  return `
    (function(w,d,i){
      ${createAnalyticsRouteGuard("w")}
      w.dataLayer = w.dataLayer || [];
      w.gtag = function(){w.dataLayer.push(arguments);}
      var f=d.getElementsByTagName("script")[0];
      var j=d.createElement("script");
      j.async=true;
      j.src="https://www.googletagmanager.com/gtag/js?id="+encodeURIComponent(i);
      f.parentNode.insertBefore(j,f);
      w.gtag("js", new Date());
      w.gtag("config", i, { send_page_view: true });
    })(window, document, ${encodedMeasurementId});
  `;
}

export function createClarityLoader(projectId: string): string {
  const encodedProjectId = JSON.stringify(projectId);

  return `
    (function(c,l,a,r,i,t,y){
      ${createAnalyticsRouteGuard("c")}
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);
      t.async=1;
      t.src="https://www.clarity.ms/tag/"+encodeURIComponent(i);
      y=l.getElementsByTagName(r)[0];
      y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", ${encodedProjectId});
  `;
}

function createAnalyticsRouteGuard(windowIdentifier: string): string {
  const encodedPathnames = JSON.stringify(analyticsExcludedPathnames);

  return `var p=${windowIdentifier}.location&&${windowIdentifier}.location.pathname||"";var __appExcludedPaths=${encodedPathnames};for(var n=0;n<__appExcludedPaths.length;n++){if(p===__appExcludedPaths[n]||p.indexOf(__appExcludedPaths[n]+"/")===0){return;}}`;
}
