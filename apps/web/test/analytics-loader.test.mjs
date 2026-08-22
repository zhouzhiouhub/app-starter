import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import {
  createClarityLoader,
  createGa4Loader,
  createGtmLoader,
} from "../src/lib/analytics-loader.ts";

test("analytics loaders do not install third-party scripts on preview routes", () => {
  const loaders = [
    createClarityLoader("clarity123"),
    createGa4Loader("G-ABC1234567"),
    createGtmLoader("GTM-ABC1234"),
  ];

  for (const pathname of ["/preview", "/preview/draft"]) {
    for (const loader of loaders) {
      const browser = runLoader(loader, pathname);

      assert.deepEqual(browser.insertedScripts, []);
      assert.equal(browser.window.clarity, undefined);
      assert.equal(browser.window.dataLayer, undefined);
      assert.equal(browser.window.gtag, undefined);
    }
  }
});

test("analytics loaders install third-party scripts on storefront routes", () => {
  const gtm = runLoader(createGtmLoader("GTM-ABC1234"), "/en");
  assert.equal(gtm.insertedScripts[0].src, "https://www.googletagmanager.com/gtm.js?id=GTM-ABC1234");
  assert.equal(gtm.window.dataLayer[0].event, "gtm.js");

  const ga4 = runLoader(createGa4Loader("G-ABC1234567"), "/en/product");
  assert.equal(ga4.insertedScripts[0].src, "https://www.googletagmanager.com/gtag/js?id=G-ABC1234567");
  assert.equal(ga4.window.dataLayer.length, 2);

  const clarity = runLoader(createClarityLoader("clarity123"), "/");
  assert.equal(clarity.insertedScripts[0].src, "https://www.clarity.ms/tag/clarity123");
  assert.equal(typeof clarity.window.clarity, "function");
});

function runLoader(loader, pathname) {
  const insertedScripts = [];
  const firstScript = {
    parentNode: {
      insertBefore(script) {
        insertedScripts.push(script);
      },
    },
  };
  const document = {
    createElement(tagName) {
      return { tagName };
    },
    getElementsByTagName(tagName) {
      return tagName === "script" ? [firstScript] : [];
    },
  };
  const window = {
    location: {
      pathname,
    },
  };

  vm.runInNewContext(loader, {
    Date,
    document,
    encodeURIComponent,
    window,
  });

  return {
    insertedScripts,
    window,
  };
}
