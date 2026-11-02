import assert from "node:assert/strict";
import test from "node:test";
import { parse, stringify } from "yaml";
import { resolveNoteSettings } from "../src/document/note-settings";
import { insertCitation } from "../src/document/citations";
import { readCitationState, writeCitationState } from "../src/document/citation-frontmatter";
import { normalizeSettings } from "../src/settings-data";

const codec = { parse: (text: string): unknown => parse(text), stringify };
const global = normalizeSettings({ allowFrontmatterOverrides: true, bibliographyPaths: ["global.bib"], localLibraryPath: "global.json" });
const note = (properties: Record<string, unknown>): string => `---\n${stringify({ "markdown-citations": properties })}---\nText`;

test("frontmatter overrides require an explicit global opt-in", () => {
  assert.equal(normalizeSettings({}).allowFrontmatterOverrides, false);
  assert.equal(normalizeSettings({ allowFrontmatterOverrides: "true" }).allowFrontmatterOverrides, false);
  const disabled = { ...global, allowFrontmatterOverrides: false };
  const result = resolveNoteSettings(disabled, "---\ninvalid\n---", { ...codec, parse: () => { throw new Error("must not parse"); } });
  assert.deepEqual(result, disabled);
  assert.notEqual(result.bibliographyPaths, disabled.bibliographyPaths);
});

test("all note overrides are independent, preserve globals, and survive citation writes", () => {
  const properties = {
    style: "ieee", locale: "en-US",
  };
  const content = note(properties);
  const effective = resolveNoteSettings(global, content, codec);
  assert.equal(effective.defaultCitationStyle, "ieee");
  assert.equal(effective.defaultLocale, "en-US");
  assert.deepEqual(effective, { ...global, defaultCitationStyle: "ieee", defaultLocale: "en-US" });
  assert.equal(global.defaultCitationStyle, "apa");
  assert.deepEqual(global.bibliographyPaths, ["global.bib"]);
  const inserted = insertCitation(content, content.length, content.length, "Example", "example", { locator: "3" }, codec);
  assert.deepEqual(resolveNoteSettings(global, inserted, codec), effective);
  const yaml = parse(inserted.split("---")[1] ?? "") as Record<string, unknown>;
  for (const [key, value] of Object.entries(properties)) assert.deepEqual((yaml["markdown-citations"] as Record<string, unknown>)[key], value);
});

test("absent and empty properties fall back and custom styles are supported", () => {
  assert.deepEqual(resolveNoteSettings(global, note({ style: "", locale: null }), codec), global);
  assert.equal(resolveNoteSettings(global, note({ style: "Styles/custom.csl" }), codec).defaultCitationStyle, "Styles/custom.csl");
});

test("invalid active overrides fail clearly before changing the note", () => {
  for (const [key, value] of [
    ["locale", "fr-CA"], ["style", "two\nlines"], ["locale", false],
  ] as const) {
    const content = note({ [key]: value });
    assert.throws(() => resolveNoteSettings(global, content, codec), new RegExp(key));
  }
});

test("international bundled locales can override the global locale", () => {
  for (const locale of ["es-ES", "fr-FR", "it-IT", "ja-JP", "nl-NL", "pl-PL", "pt-BR", "ru-RU", "zh-CN"]) {
    assert.equal(resolveNoteSettings(global, note({ locale }), codec).defaultLocale, locale);
  }
});

test("old top-level style and locale migrate without changing citations or note content", () => {
  const original = '---\ntitle: Keep\nmc-style: ieee\nmc-locale: en-GB\n---\nText';
  const inserted = insertCitation(original, original.length, original.length, "Example", "example", { locator: "3" }, codec);
  assert.ok(!/^mc-(?:style|locale):/mu.test(inserted));
  const state = readCitationState(inserted, codec);
  assert.equal(state.style, "ieee");
  assert.equal(state.locale, "en-GB");
  assert.equal(state.citations.c1?.locator, "3");
  assert.equal(resolveNoteSettings(global, inserted, codec).defaultCitationStyle, "ieee");
  assert.ok(inserted.includes("title: Keep"));
});

test("disabled overrides preserve invalid user choices during registry updates", () => {
  const content = note({ style: 42, locale: false });
  assert.deepEqual(resolveNoteSettings({ ...global, allowFrontmatterOverrides: false }, content, codec), { ...global, allowFrontmatterOverrides: false });
  const state = readCitationState(content, codec);
  const rewritten = writeCitationState(content, state, codec);
  assert.equal(readCitationState(rewritten, codec).style, 42);
  assert.equal(readCitationState(rewritten, codec).locale, false);
});

test("former non-formatting overrides have no effect even when enabled", () => {
  const content = note({ "mc-heading": "Sources", "mc-heading-enabled": false,
    "mc-position": "end", "mc-bibliography": [], "mc-local-library": "" });
  assert.deepEqual(resolveNoteSettings(global, content, codec), global);
});
