import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SETTINGS, normalizeSettings } from "../src/settings-data";

test("normalizeSettings returns safe mobile defaults", () => {
  assert.deepEqual(normalizeSettings(undefined), DEFAULT_SETTINGS);
  assert.equal(normalizeSettings(undefined).localLibraryPath, "");
  assert.equal(normalizeSettings({ localLibraryPath: "" }).localLibraryPath, "");
  assert.equal(normalizeSettings({ localLibraryPath: "Library/custom.json" }).localLibraryPath, "Library/custom.json");
});

test("obsolete bundled styles migrate while custom CSL paths remain unchanged", () => {
  assert.equal(normalizeSettings({ defaultCitationStyle: "din-1505-2" }).defaultCitationStyle, "iso690-author-date-localized");
  assert.equal(normalizeSettings({ defaultCitationStyle: "elsevier-vancouver" }).defaultCitationStyle, "nlm-citation-sequence");
  assert.equal(normalizeSettings({ defaultCitationStyle: "Styles/custom.csl" }).defaultCitationStyle, "Styles/custom.csl");
});

test("normalizeSettings cleans and deduplicates bibliography paths", () => {
  const settings = normalizeSettings({
    bibliographyPaths: [
      " /Literature/library.bib ",
      "Literature\\library.bib",
      "",
      42,
      "Sources/references.json/",
    ],
  });

  assert.deepEqual(settings.bibliographyPaths, [
    "Literature/library.bib",
    "Sources/references.json",
  ]);
});

test("normalization discards the removed citation mode and retains unrelated preferences", () => {
  const legacy = normalizeSettings({
    citationMode: "pandoc",
    bibliographyPosition: "end",
  });
  assert.equal("citationMode" in legacy, false);
  assert.equal(legacy.bibliographyPosition, "end");

  const fallback = normalizeSettings({
    citationMode: "html",
    bibliographyPosition: "elsewhere",
  });
  assert.equal("citationMode" in fallback, false);
  assert.equal(fallback.bibliographyPosition, "cursor");
});

test("normalizeSettings migrates placeholder placement and defaults the heading toggle", () => {
  const settings = normalizeSettings({ bibliographyPosition: "placeholder" });
  assert.equal(settings.bibliographyPosition, "cursor");
  assert.equal(settings.includeBibliographyHeading, true);

  const withoutHeading = normalizeSettings({ includeBibliographyHeading: false });
  assert.equal(withoutHeading.includeBibliographyHeading, false);
});
