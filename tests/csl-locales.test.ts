import assert from "node:assert/strict";
import test from "node:test";
import {
  BUNDLED_CSL_LOCALES,
  cslLocaleTitle,
  getCslLocale,
  isSupportedCslLocale,
} from "../src/csl/locales";

test("bundled CSL locales expose the supported international choices", () => {
  assert.equal(BUNDLED_CSL_LOCALES.length, 12);
  assert.equal(new Set(BUNDLED_CSL_LOCALES.map(locale => locale.id)).size, 12);
  for (const locale of BUNDLED_CSL_LOCALES) {
    assert.match(locale.content, new RegExp(`xml:lang=["']${locale.id}["']`, "u"));
    assert.match(locale.content, /creativecommons\.org\/licenses\/by-sa\/3\.0/u);
    assert.equal(isSupportedCslLocale(locale.id), true);
    assert.equal(cslLocaleTitle(locale.id), locale.title);
  }
});

test("unknown CSL locales retain the documented English fallback", () => {
  assert.equal(isSupportedCslLocale("fr-CA"), false);
  assert.equal(getCslLocale("fr-CA"), getCslLocale("en-US"));
  assert.equal(cslLocaleTitle("fr-CA"), "fr-CA");
});
