import assert from "node:assert/strict";
import test from "node:test";
import { BUNDLED_CITATION_STYLES, getBundledCitationStyle } from "../src/csl/styles";

test("bundled CSL styles expose unique installed choices", () => {
  assert.equal(BUNDLED_CITATION_STYLES.length, 7);
  assert.equal(new Set(BUNDLED_CITATION_STYLES.map((style) => style.id)).size, 7);
  assert.equal(getBundledCitationStyle("apa")?.title, "APA 7th edition");
});

test("bundled CSL styles retain metadata and license attribution", () => {
  for (const style of BUNDLED_CITATION_STYLES) {
    assert.match(style.content, /<title>[^<]+<\/title>/u);
    assert.match(style.content, /creativecommons\.org\/licenses\/by-sa\/3\.0/u);
    assert.ok(style.content.includes(`<id>http://www.zotero.org/styles/${style.id}</id>`));
  }
});
