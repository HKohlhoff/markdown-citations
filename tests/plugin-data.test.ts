import assert from "node:assert/strict";
import test from "node:test";
import { CURRENT_SCHEMA_VERSION, normalizePluginData } from "../src/plugin-data";

test("normalizePluginData wraps legacy flat settings", () => {
  const data = normalizePluginData({
    citationMode: "pandoc",
    bibliographyHeading: "References",
  });

  assert.equal(data.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal(data.settings.citationMode, "pandoc");
  assert.equal(data.settings.bibliographyHeading, "References");
});

test("normalizePluginData prefers the settings object", () => {
  const data = normalizePluginData({
    schemaVersion: 99,
    citationMode: "pandoc",
    settings: {
      citationMode: "markdown",
      defaultLocale: "en-US",
    },
  });

  assert.equal(data.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal(data.settings.citationMode, "markdown");
  assert.equal(data.settings.defaultLocale, "en-US");
});
