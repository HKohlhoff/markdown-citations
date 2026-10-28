import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SETTINGS, normalizeSettings } from "../src/settings-data";

test("normalizeSettings returns safe mobile defaults", () => {
  assert.deepEqual(normalizeSettings(undefined), DEFAULT_SETTINGS);
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

test("normalizeSettings accepts supported modes and rejects unknown values", () => {
  const pandoc = normalizeSettings({
    citationMode: "pandoc",
    bibliographyPosition: "end",
  });
  assert.equal(pandoc.citationMode, "pandoc");
  assert.equal(pandoc.bibliographyPosition, "end");

  const fallback = normalizeSettings({
    citationMode: "html",
    bibliographyPosition: "elsewhere",
  });
  assert.equal(fallback.citationMode, "markdown");
  assert.equal(fallback.bibliographyPosition, "cursor");
});

test("normalizeSettings migrates placeholder placement and defaults the heading toggle", () => {
  const settings = normalizeSettings({ bibliographyPosition: "placeholder" });
  assert.equal(settings.bibliographyPosition, "cursor");
  assert.equal(settings.includeBibliographyHeading, true);

  const withoutHeading = normalizeSettings({ includeBibliographyHeading: false });
  assert.equal(withoutHeading.includeBibliographyHeading, false);
});
