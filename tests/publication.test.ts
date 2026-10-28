import assert from "node:assert/strict";
import test from "node:test";
import { parse, stringify } from "yaml";
import { getBundledCitationStyle } from "../src/csl/styles";
import { BIBLIOGRAPHY_START, BIBLIOGRAPHY_END } from "../src/document/bibliography";
import { readCitationState, writeCitationState } from "../src/document/citation-frontmatter";
import { findDocumentCitations, insertCitation } from "../src/document/citations";
import type { ResolveEmbedding, SourceNote } from "../src/document/master";
import { assertPublicationOwnership, buildPublication, publicationPath } from "../src/document/publication";
import { updateCitationDocument } from "../src/document/update-document";
import type { BibliographyItem } from "../src/model/bibliography";
import { normalizeSettings } from "../src/settings-data";

const codec = { parse: (source: string): unknown => parse(source), stringify };
const settings = normalizeSettings({ defaultCitationStyle: "ieee", defaultLocale: "en-US" });
const style = getBundledCitationStyle("ieee")?.content ?? "";
const sources: BibliographyItem[] = ["Alpha", "Beta"].map(name => ({
  citeKey: name.toLowerCase(), sourcePath: "references.json",
  csl: { id: name.toLowerCase(), type: "book", title: `${name} source`, author: [{ family: name }], issued: { "date-parts": [[2024]] } },
}));
const cite = (content: string, key: string, page: string): string => insertCitation(content, content.length, content.length,
  `(${key}, 2024)`, key, { locatorType: "page", locator: page, suffix: "emphasis added" }, codec);
const resolver = (notes: SourceNote[]): ResolveEmbedding => async target => {
  if (target === "image.png") return null;
  const note = notes.find(entry => entry.path === `${target}.md`);
  if (!note) throw new Error(`Missing note: ${target}`);
  return { note };
};

test("publication is a sibling with the requested suffix", () => {
  assert.equal(publicationPath("Book/Master.md"), "Book/Master_publishVersion.md");
  assert.equal(publicationPath("Book/Mein Buch.md"), "Book/Mein Buch_publishVersion.md");
  assert.throws(() => publicationPath("Master.txt"), /Markdown/u);
});

test("only a publication owned by the same master may be replaced", () => {
  const owned = '---\nmarkdown-citations:\n  version: 1\n  citations: {}\n  publication:\n    source: Book/Master.md\n---\nText';
  assert.doesNotThrow(() => assertPublicationOwnership(owned, "Book/Master.md", codec));
  assert.throws(() => assertPublicationOwnership(owned, "Other/Master.md", codec), /will not be overwritten/u);
  assert.throws(() => assertPublicationOwnership("An unrelated note", "Book/Master.md", codec), /will not be overwritten/u);
});

test("publication expands chapters, remaps colliding IDs, and formats the whole document", async () => {
  const a = { path: "A.md", content: cite("# A\n", "beta", "23") + "\n![[B]]" };
  const b = { path: "B.md", content: cite("# B\n", "alpha", "27") };
  const root = { path: "Book.md", content: '---\ntitle: "My book" # keep\n---\n# Book\n![[A]]' };
  const snapshots = [root.content, a.content, b.content];
  const result = await buildPublication(root, sources, settings, style, codec, resolver([a, b]));
  assert.ok(!result.content.includes("![[A]]"));
  assert.ok(!result.content.includes("![[B]]"));
  assert.ok(result.content.includes('title: "My book" # keep'));
  const citations = findDocumentCitations(result.content);
  assert.deepEqual(citations.map(entry => entry.id), ["c1", "c2"]);
  assert.match(citations[0]?.label ?? "", /1.*23/u);
  assert.match(citations[1]?.label ?? "", /2.*27/u);
  const state = readCitationState(result.content, codec);
  assert.equal(state.citations.c1?.citeKey, "beta");
  assert.equal(state.citations.c2?.locator, "27");
  assert.equal(state.citations.c1?.suffix, "emphasis added");
  assert.deepEqual(state.publication, { source: "Book.md" });
  assert.equal(state.style, "ieee");
  assert.equal(state.master, undefined);
  assert.deepEqual([root.content, a.content, b.content], snapshots);
  assert.equal((await buildPublication(root, sources, settings, style, codec, resolver([a, b]))).content, result.content);
});

test("repeated embeddings retain each occurrence but share bibliography entries", async () => {
  const a = { path: "A.md", content: cite("A ", "alpha", "3") };
  const root = { path: "Master.md", content: "![[A]]\n![[A]]" };
  const result = await buildPublication(root, sources, settings, style, codec, resolver([a]));
  assert.equal(result.sourceCount, 1);
  assert.equal(result.citationCount, 2);
  assert.equal(Object.keys(readCitationState(result.content, codec).citations).length, 2);
  assert.equal((result.content.match(/<a id="ref-alpha"/gu) ?? []).length, 1);
});

test("a publication can change its own style while preserving ownership and citation details", async () => {
  const root = { path: "Master.md", content: "![[A]]" };
  const chapter = { path: "A.md", content: cite("Chapter ", "alpha", "23") };
  const built = await buildPublication(root, sources, settings, style, codec, resolver([chapter]));
  const state = readCitationState(built.content, codec);
  state.style = "apa";
  const changed = writeCitationState(built.content, state, codec);
  const updated = await updateCitationDocument({ path: "Master_publishVersion.md", content: changed }, sources,
    { ...settings, defaultCitationStyle: "apa" }, getBundledCitationStyle("apa")?.content ?? "", codec,
    () => resolver([]), 0, true);
  assert.match(findDocumentCitations(updated.content)[0]?.label ?? "", /Alpha.*2024.*23/u);
  assert.equal(readCitationState(updated.content, codec).citations.c1?.locator, "23");
  assertPublicationOwnership(updated.content, "Master.md", codec);
  assert.equal(root.content, "![[A]]");
});

test("only selected fragments expand; code, comments, and media remain intact", async () => {
  let chapter = cite("# Included\n", "alpha", "3");
  const includedEnd = chapter.length;
  chapter += '\n# Excluded\n[(Missing)](#ref-missing)';
  const root = { path: "Master.md", content: '![[A#Included]]\n`![[Missing]]`\n<!-- ![[Missing]] -->\n![[image.png]]\nParagraph. ^block\n` ^code-block`' };
  const result = await buildPublication(root, sources, settings, style, codec, async target => {
    if (target === "image.png") return null;
    assert.equal(target, "A#Included");
    return { note: { path: "A.md", content: chapter }, range: { start: 0, end: includedEnd } };
  });
  assert.equal(result.citationCount, 1);
  assert.ok(!result.content.includes("# Excluded"));
  assert.ok(result.content.includes("`![[Missing]]`"));
  assert.ok(result.content.includes("![[image.png]]"));
  assert.ok(!result.content.includes("Paragraph. ^block"));
  assert.ok(result.content.includes("` ^code-block`"));
  assert.ok(!result.content.includes("---\n", result.content.indexOf("# Included")));
});

test("chapter bibliographies are removed and the common bibliography retains the master's position", async () => {
  const old = `${BIBLIOGRAPHY_START}\nOBSOLETE\n${BIBLIOGRAPHY_END}`;
  const a = { path: "A.md", content: cite("A ", "alpha", "3") + "\n" + old };
  const root = { path: "Master.md", content: "![[A]]\n" + old + "\nAfter bibliography" };
  const result = await buildPublication(root, sources, settings, style, codec, resolver([a]));
  assert.equal((result.content.match(/markdown-citations:bibliography:start/gu) ?? []).length, 1);
  assert.ok(!result.content.includes("OBSOLETE"));
  assert.ok(result.content.indexOf(BIBLIOGRAPHY_END) < result.content.indexOf("After bibliography"));
});

test("missing sources, missing embeddings, cycles, and publication-as-input abort safely", async () => {
  const root = { path: "Master.md", content: "![[A]]" };
  await assert.rejects(buildPublication(root, sources, settings, style, codec, resolver([])), /Missing note/u);
  await assert.rejects(buildPublication(root, sources, settings, style, codec, resolver([{ path: "A.md", content: "![[A]]" }])), /Cyclic/u);
  const a = { path: "A.md", content: cite("A ", "alpha", "3") };
  await assert.rejects(buildPublication(root, [], settings, style, codec, resolver([a])), /Missing bibliography source/u);
  const result = await buildPublication(root, sources, settings, style, codec, resolver([a]));
  await assert.rejects(buildPublication({ path: "Master_publishVersion.md", content: result.content }, sources, settings, style, codec, resolver([a])), /original master/u);
  assert.equal(root.content, "![[A]]");
});
