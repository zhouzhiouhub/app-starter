import assert from "node:assert/strict";
import test from "node:test";
import { exampleLandingPage } from "@app-starter/schema";
import {
  copyDesktopLayoutToMobile,
  readSectionLayout,
  updateSectionLayoutField,
  updateSectionLayoutTextField,
  updateSectionVisibility,
} from "../src/features/pages/section-layout-updates.ts";

test("mobile layout field edits do not change desktop layout", () => {
  const schema = structuredClone(exampleLandingPage);
  const originalDesktopLayout = structuredClone(schema.sections[0].layout.desktop);
  const originalMobileWidth = schema.sections[0].layout.mobile.width;

  const updated = updateSectionLayoutField(
    schema,
    "hero",
    "mobile",
    "width",
    320,
  );

  assert.equal(updated.sections[0].layout.mobile.width, 320);
  assert.deepEqual(updated.sections[0].layout.desktop, originalDesktopLayout);
  assert.equal(schema.sections[0].layout.mobile.width, originalMobileWidth);
});

test("blank layout text edits remove only the active viewport field", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.sections[0].layout.desktop.gap = "32px";
  schema.sections[0].layout.mobile.gap = "16px";

  const updated = updateSectionLayoutTextField(
    schema,
    "hero",
    "mobile",
    "gap",
    "   ",
  );

  assert.equal(updated.sections[0].layout.mobile.gap, undefined);
  assert.equal(updated.sections[0].layout.desktop.gap, "32px");
  assert.equal(schema.sections[0].layout.mobile.gap, "16px");
});

test("visibility edits apply only to the selected viewport", () => {
  const schema = structuredClone(exampleLandingPage);

  const updated = updateSectionVisibility(schema, "hero", "mobile", false);

  assert.equal(updated.sections[0].visibility.mobile, false);
  assert.equal(updated.sections[0].visibility.desktop, true);
  assert.equal(schema.sections[0].visibility.mobile, true);
});

test("desktop to mobile layout copy clamps mobile width", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.sections[0].layout.desktop = {
    gap: "24px",
    height: 560,
    padding: "80px 96px",
    width: 1440,
    x: 24,
    y: 48,
  };

  const updated = copyDesktopLayoutToMobile(schema, "hero");

  assert.deepEqual(updated.sections[0].layout.mobile, {
    gap: "24px",
    height: 560,
    padding: "80px 96px",
    width: 390,
    x: 24,
    y: 48,
  });
  assert.equal(updated.sections[0].layout.desktop.width, 1440);
});

test("missing viewport layout falls back to the viewport canvas width", () => {
  const section = structuredClone(exampleLandingPage.sections[0]);
  delete section.layout.mobile;

  assert.deepEqual(readSectionLayout(section, "mobile"), {
    width: 390,
    x: 0,
    y: 0,
  });
});
