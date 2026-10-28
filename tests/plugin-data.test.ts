import assert from "node:assert/strict";
import test from "node:test";
import { CURRENT_SCHEMA_VERSION, normalizePluginData } from "../src/plugin-data";

test("normalizePluginData wraps legacy flat settings", () => {
  const data = normalizePluginData({
    citationMode: "pandoc",
    bibliographyHeading: "References",
  });

  assert.equal(data.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal("citationMode" in data.settings, false);
  assert.equal(data.settings.bibliographyHeading, "References");
  assert.equal(data.lastReadUpdateVersion, "");
});

test("update acknowledgements survive normalization and invalid values default to unread", () => {
  assert.equal(normalizePluginData({ lastReadUpdateVersion: "0.1.0", settings: {} }).lastReadUpdateVersion, "0.1.0");
  assert.equal(normalizePluginData({ lastReadUpdateVersion: 100 }).lastReadUpdateVersion, "");
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
  assert.equal("citationMode" in data.settings, false);
  assert.equal(data.settings.defaultLocale, "en-US");
});
