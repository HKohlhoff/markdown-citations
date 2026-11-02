import assert from "node:assert/strict";
import test from "node:test";
import { BUNDLED_CITATION_STYLES, getBundledCitationStyle } from "../src/csl/styles";

test("bundled CSL styles expose unique installed choices", () => {
  assert.equal(BUNDLED_CITATION_STYLES.length, 9);
  assert.equal(new Set(BUNDLED_CITATION_STYLES.map((style) => style.id)).size, 9);
  assert.equal(getBundledCitationStyle("apa")?.title, "APA 7th edition");
});

test("bundled CSL styles retain metadata and license attribution", () => {
  for (const style of BUNDLED_CITATION_STYLES) {
    assert.match(style.content, /<title>[^<]+<\/title>/u);
    assert.match(style.content, /creativecommons\.org\/licenses\/by-sa\/3\.0/u);
    const id = style.content.match(/<id>([^<]+)<\/id>/u)?.[1];
    assert.ok(id);
    assert.equal(new URL(id).pathname.split("/").pop(), style.id);
  }
});
