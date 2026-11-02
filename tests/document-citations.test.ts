import assert from "node:assert/strict";
import test from "node:test";
import { parse, stringify } from "yaml";
import { findDocumentCitations, insertCitation, renderCitationLink, rewriteDocumentCitations } from "../src/document/citations";
import { readCitationState } from "../src/document/citation-frontmatter";
import { citedItemsInDocument, updateBibliography } from "../src/document/bibliography";
import { formatCslBibliography, formatCslCitation } from "../src/csl/processor";
import { getBundledCitationStyle } from "../src/csl/styles";
import type { BibliographyItem } from "../src/model/bibliography";

const codec = { parse: (value: string): unknown => parse(value), stringify };
const item: BibliographyItem = {
  citeKey: "mueller2024", sourcePath: "library.json",
  csl: { id: "mueller2024", type: "book", author: [{ family: "Müller", given: "Anna" }], title: "Example", issued: { "date-parts": [[2024]] } },
};

function insert(content: string, locator = "23"): string {
  return insertCitation(content, content.length, content.length, `(Müller, 2024, S. ${locator})`, item.citeKey,
    { form: "parenthetical", locatorType: "page", locator, prefix: "vgl.", suffix: "Hervorhebung geprüft" }, codec);
}

test("new citations store details in frontmatter and only a short ID in the link", () => {
  const content = insert("Text ");
  const citations = findDocumentCitations(content);
  assert.equal(citations.length, 1);
  assert.equal(citations[0]?.id, "c1");
  assert.equal(readCitationState(content, codec).citations.c1?.locator, "23");
  assert.match(content, /\]\(#ref-mueller2024 "mc:c1"\)$/u);
  assert.doesNotMatch(content, /<!--/u);
});

test("numeric labels escape inner brackets so Obsidian does not create wikilinks", () => {
  const link = renderCitationLink("[1, S. 3]", item.citeKey, "c1");
  assert.equal(link, '[\\[1, S. 3\\]](#ref-mueller2024 "mc:c1")');
  assert.equal(findDocumentCitations(link)[0]?.label, "[1, S. 3]");
  assert.equal(findDocumentCitations(link)[0]?.id, "c1");
  assert.equal(findDocumentCitations('[[1]](#ref-mueller2024 "mc:c1")')[0]?.label, "[1]");
});

test("same source on different pages keeps independent details across repeated updates", () => {
  const content = insert(insert("First ") + "\nSecond ", "27");
  const changed = rewriteDocumentCitations(content, [item], codec, (_item, details) => `[1, p. ${details.locator ?? ""}]`);
  assert.equal(changed.updated, 2);
  assert.equal(findDocumentCitations(changed.content)[0]?.label, "[1, p. 23]");
  assert.equal(findDocumentCitations(changed.content)[1]?.label, "[1, p. 27]");
  assert.deepEqual(readCitationState(changed.content, codec), readCitationState(content, codec));
  const again = rewriteDocumentCitations(changed.content, [item], codec, (_item, details) => `[1, p. ${details.locator ?? ""}]`);
  assert.equal(again.content, changed.content);
});

test("legacy inline comments migrate without losing citation details", () => {
  const details = { version: 1, citeKey: item.citeKey, form: "narrative", locatorType: "chapter", locator: "II", prefix: "see", suffix: "a --> b" };
  const content = `Text [Müller (2024)](#ref-mueller2024)<!-- markdown-citations:cite:${encodeURIComponent(JSON.stringify(details))} -->`;
  const changed = rewriteDocumentCitations(content, [item], codec, () => "Müller (2024, chap. II)");
  assert.equal(changed.migrated, 1);
  assert.doesNotMatch(changed.content, /<!--/u);
  const stored = readCitationState(changed.content, codec).citations.c1;
  assert.equal(stored?.locator, "II");
  assert.equal(stored?.prefix, "see");
  assert.equal(stored?.suffix, "a --> b");
});

test("migration retains unknown-source details while removing their old comments", () => {
  const details = { citeKey: item.citeKey, locator: "12" };
  const content = `[(Müller, 2024)](#ref-mueller2024)<!-- markdown-citations:cite:${encodeURIComponent(JSON.stringify(details))} -->`;
  const changed = rewriteDocumentCitations(content, [], codec, () => "Never");
  assert.equal(changed.skipped, 1);
  assert.equal(readCitationState(changed.content, codec).citations.c1?.locator, "12");
  assert.doesNotMatch(changed.content, /<!--/u);
});

test("unrelated YAML comments, formatting and fields survive insertion and updates exactly", () => {
  const yaml = '# My comment\ntitle: "A title"\ntags: [a, b]\ncustom:\n  value: 42\n';
  const original = `---\n${yaml}---\nBody `;
  const content = insert(original);
  const updated = rewriteDocumentCitations(content, [item], codec, () => "[1]").content;
  assert.ok(updated.startsWith(`---\n${yaml}`));
  assert.equal((parse(updated.split("---")[1] ?? "") as { custom: { value: number } }).custom.value, 42);
  assert.equal(findDocumentCitations(updated).length, 1);
});

test("code, YAML, comments and ordinary links are excluded from updates and bibliography", () => {
  const example = '[(Müller, 2024)](#ref-mueller2024)';
  const content = `---\nexample: '${example}'\n---\n\n\`\`\`md\n${example}\n\`\`\`\n\n\`${example}\`\n<!-- ${example} -->\n[site](https://example.com)\n`;
  const changed = rewriteDocumentCitations(content, [item], codec, () => "[1]");
  assert.equal(changed.content, content);
  assert.equal(changed.updated, 0);
  assert.deepEqual(citedItemsInDocument(content, [item]), []);
});

test("malformed YAML and mismatched ownership stop updates before any change", () => {
  assert.throws(() => insert('---\ninvalid: [\n---\nText'), /./u);
  const content = insert("Text ").replace("#ref-mueller2024", "#ref-other");
  assert.throws(() => rewriteDocumentCitations(content, [item], codec, () => "[1]"), /disagree/u);
});

test("updating a field in the middle preserves the following YAML fields and CRLF endings", () => {
  const content = insert("Text ").replace(/\n/gu, "\r\n");
  const augmented = content.replace("\r\n---\r\nText", '\r\nafter: "keep me" # comment\r\n---\r\nText');
  const changed = rewriteDocumentCitations(augmented, [item], codec, () => "[1]").content;
  assert.ok(changed.includes('after: "keep me" # comment\r\n---\r\nText'));
  assert.doesNotMatch(changed, /(?<!\r)\n/u);
  assert.equal(readCitationState(changed, codec).citations.c1?.locator, "23");
});

test("plain citations with unrecognized prefixes remain untouched and are reported", () => {
  const content = '[(according to Müller, 2024)](#ref-mueller2024)';
  const changed = rewriteDocumentCitations(content, [item], codec, () => "[1]");
  assert.equal(changed.content, content);
  assert.equal(changed.skipped, 1);
});

test("creating frontmatter keeps a first bibliography at the requested body cursor", () => {
  const content = '[(Müller, 2024)](#ref-mueller2024)\n\nHERE\n\nAfter';
  const cursor = content.indexOf("HERE");
  const changed = rewriteDocumentCitations(content, [item], codec, () => "[1]", cursor);
  assert.equal(changed.content.slice(changed.cursorOffset, changed.cursorOffset + 4), "HERE");
  const bibliography = updateBibliography(changed.content, [item], "References", true, "cursor", changed.cursorOffset);
  assert.equal(readCitationState(bibliography.content, codec).citations.c1?.citeKey, item.citeKey);
  assert.ok(bibliography.content.indexOf("## References") < bibliography.content.indexOf("HERE"));
});

test("plain prototype citations retain visible pages and narrative form during adoption", () => {
  const content = '[(Müller, 2024, S. 3)](#ref-mueller2024) and [Müller (2024)](#ref-mueller2024)';
  const changed = rewriteDocumentCitations(content, [item], codec, () => "updated");
  const state = readCitationState(changed.content, codec);
  assert.equal(state.citations.c1?.locator, "3");
  assert.equal(state.citations.c2?.form, "narrative");
});

test("style changes update citations and bibliography together and can round-trip with pages", () => {
  const ieee = getBundledCitationStyle("ieee")?.content ?? "";
  const apa = getBundledCitationStyle("apa")?.content ?? "";
  const original = insert("Text ");
  const rewrite = (content: string, style: string): string => {
    const items = citedItemsInDocument(content, [item]);
    const changed = rewriteDocumentCitations(content, [item], codec,
      (source, details) => formatCslCitation(items, source, details, style, "de-DE"));
    return updateBibliography(changed.content, items, "Literatur", true, "end", 0,
      formatCslBibliography(items, style, "de-DE")).content;
  };
  const numeric = rewrite(original, ieee);
  assert.match(findDocumentCitations(numeric)[0]?.label ?? "", /1/u);
  assert.match(numeric, /<a id="ref-mueller2024" style="scroll-margin-top: 5rem;"><\/a>/u);
  const restored = rewrite(numeric, apa);
  assert.match(findDocumentCitations(restored)[0]?.label ?? "", /S\. 23/u);
  assert.match(findDocumentCitations(restored)[0]?.label ?? "", /Müller/u);
  assert.doesNotMatch(restored, /markdown-citations:cite:/u);
});
