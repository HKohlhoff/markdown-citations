import assert from "node:assert/strict";
import test from "node:test";
import { parse, stringify } from "yaml";
import { bibliographyAnchor } from "../src/citation/render";
import { getBundledCitationStyle } from "../src/csl/styles";
import { readCitationState } from "../src/document/citation-frontmatter";
import { insertCitation, rewriteDocumentCitations } from "../src/document/citations";
import { collectMasterCitations, findNoteEmbeddings, type SourceNote, type ResolveEmbedding } from "../src/document/master";
import { updateCitationDocument } from "../src/document/update-document";
import { resolveNoteSettings } from "../src/document/note-settings";
import type { BibliographyItem } from "../src/model/bibliography";
import { normalizeSettings } from "../src/settings-data";

const codec = { parse: (value: string): unknown => parse(value), stringify };
const sources: BibliographyItem[] = ["Alpha", "Beta", "Gamma"].map((name, index) => ({
  citeKey: name.toLowerCase(), sourcePath: "library.json",
  csl: { id: name.toLowerCase(), type: "book", title: `${name} source`, author: [{ family: name }], issued: { "date-parts": [[2024 + index]] } },
}));
const settings = normalizeSettings({ bibliographyPosition: "end" });
const style = getBundledCitationStyle("apa")?.content ?? "";

test("master uses its own overrides and ignores child formatting properties", async () => {
  const a = citation({ path: "A.md", content: '---\nmarkdown-citations:\n  style: invalid-child-style\n  locale: invalid\n---\nA ' }, "alpha");
  const snapshot = a.content;
  const root = { path: "Master.md", content: '---\nmarkdown-citations:\n  style: ieee\n  locale: en-US\n---\n![[A]]' };
  const effective = resolveNoteSettings({ ...settings, allowFrontmatterOverrides: true }, root.content, codec);
  const result = await updateCitationDocument(root, sources, effective, getBundledCitationStyle("ieee")?.content ?? "", codec, resolver([a]), 0, true);
  assert.equal(readCitationState(result.content, codec).master?.style, "ieee");
  assert.equal(readCitationState(result.content, codec).master?.locale, "en-US");
  assert.ok(result.content.includes("## Literatur"));
  assert.ok(result.content.includes("style: ieee"));
  assert.equal(a.content, snapshot);
});

function citation(note: SourceNote, citeKey: string, page = "3"): SourceNote {
  return { ...note, content: insertCitation(note.content, note.content.length, note.content.length,
    `(${citeKey}, 2024, S. ${page})`, citeKey, { locatorType: "page", locator: page }, codec) };
}

function resolver(notes: readonly SourceNote[]): (root: SourceNote) => ResolveEmbedding {
  return root => async (target) => {
    if (target === "image.png") return null;
    const path = `${target}.md`;
    const note = [root, ...notes].find(candidate => candidate.path === path);
    if (!note) throw new Error(`Missing note: ${target}`);
    return { note };
  };
}

test("master follows nested embeddings in reading order and scopes identical IDs by source file", async () => {
  const a = citation({ path: "A.md", content: "A " }, "beta", "23");
  const b = citation({ path: "B.md", content: "B " }, "alpha", "27");
  a.content += "\n![[B]]";
  const root = citation({ path: "Master.md", content: "Before " }, "gamma");
  root.content += "\n![[A|Chapter A]]\nAfter";
  const collected = await collectMasterCitations(root, sources, codec, resolver([a, b])(root));
  assert.deepEqual(collected.items.map(item => item.citeKey), ["gamma", "beta", "alpha"]);
  assert.deepEqual(collected.documents, ["A.md", "B.md"]);
  assert.deepEqual(collected.citations.map(item => [item.sourcePath, item.citationId, item.locator]),
    [["Master.md", "c1", "3"], ["A.md", "c1", "23"], ["B.md", "c1", "27"]]);
});

test("repeated embeddings count occurrences but include each source in the bibliography once", async () => {
  const a = citation({ path: "A.md", content: "A " }, "alpha");
  const root = { path: "Master.md", content: "![[A]]\n![[A]]" };
  const result = await collectMasterCitations(root, sources, codec, resolver([a])(root));
  assert.equal(result.items.length, 1);
  assert.deepEqual(result.documents, ["A.md"]);
  assert.equal(result.citations[0]?.occurrences, 2);
});

test("heading and block ranges contribute only citations and nested embeds in the selected fragment", async () => {
  let chapter = citation({ path: "Chapter.md", content: "# Outside\n" }, "alpha");
  chapter.content += "\n# Included\n";
  chapter = citation(chapter, "beta");
  const start = chapter.content.indexOf("# Included\n") + "# Included\n".length;
  const end = chapter.content.length;
  chapter.content += "\n# Excluded\n![[Missing]]";
  const root = { path: "Master.md", content: "![[Chapter#Included]]\n![[Chapter#^block]]" };
  const result = await collectMasterCitations(root, sources, codec, async target => {
    assert.ok(target === "Chapter#Included" || target === "Chapter#^block");
    return { note: chapter, range: { start, end } };
  });
  assert.deepEqual(result.items.map(item => item.citeKey), ["beta"]);
  assert.equal(result.citations[0]?.occurrences, 2);
});

test("examples, ordinary wikilinks, comments and bibliography embeds are ignored", async () => {
  const content = '---\nexample: "![[Missing]]"\n---\n[[Missing]]\n`![[Missing]]`\n<!-- ![[Missing]] -->\n```md\n![[Missing]]\n```\n<!-- markdown-citations:bibliography:start -->\n![[Missing]]\n<!-- markdown-citations:bibliography:end -->\n![[image.png]]';
  assert.deepEqual(findNoteEmbeddings(content).map(embed => embed.target), ["image.png"]);
  const root = { path: "Master.md", content };
  const result = await collectMasterCitations(root, sources, codec, async target => {
    assert.equal(target, "image.png"); return null;
  });
  assert.equal(result.hasEmbeddings, false);
});

test("missing and cyclic embeddings abort without modifying root or chapter sources", async () => {
  const root = { path: "Master.md", content: "![[A]]" };
  const a = { path: "A.md", content: "![[Master]]" };
  await assert.rejects(collectMasterCitations(root, sources, codec, resolver([a])(root)), /Cyclic/u);
  await assert.rejects(collectMasterCitations(root, sources, codec, resolver([])(root)), /Missing/u);
  assert.equal(root.content, "![[A]]");
  assert.equal(a.content, "![[Master]]");
});

test("removing embeddings prunes the master index and bibliography, leaving chapters unchanged", async () => {
  const a = citation({ path: "A.md", content: "A " }, "alpha", "23");
  const b = citation({ path: "B.md", content: "B " }, "beta", "27");
  const chapterSnapshots = [a.content, b.content];
  const root = { path: "Master.md", content: '---\ntitle: "Preserve me" # comment\n---\n![[A]]\n![[B]]' };
  const first = await updateCitationDocument(root, sources, settings, style, codec, resolver([a, b]), 0, true);
  assert.equal(first.sourceCount, 2);
  assert.ok(first.content.includes(bibliographyAnchor("alpha")));
  assert.ok(first.content.startsWith('---\ntitle: "Preserve me" # comment\n'));
  const state = readCitationState(first.content, codec);
  assert.equal(state.master?.style, "apa");
  assert.equal(state.master?.citations.find(record => record.sourcePath === "A.md")?.locator, "23");
  const second = await updateCitationDocument({ path: root.path, content: first.content.replace("![[A]]", "") },
    sources, settings, style, codec, resolver([a, b]), 0, true);
  assert.equal(second.sourceCount, 1);
  const secondState = readCitationState(second.content, codec);
  assert.deepEqual(secondState.master?.documents, ["B.md"]);
  assert.deepEqual(secondState.master?.citations.map(record => record.citeKey), ["beta"]);
  assert.ok(!second.content.includes(bibliographyAnchor("alpha")));
  const empty = await updateCitationDocument({ path: root.path, content: second.content.replace("![[B]]", "") },
    sources, settings, style, codec, resolver([]), 0, true);
  assert.equal(empty.sourceCount, 0);
  assert.deepEqual(readCitationState(empty.content, codec).master?.citations, []);
  assert.deepEqual(readCitationState(empty.content, codec).master?.documents, []);
  assert.deepEqual([a.content, b.content], chapterSnapshots);
});

test("a source remains when a removed chapter's source is still cited in another chapter", async () => {
  const a = citation({ path: "A.md", content: "A " }, "alpha");
  const b = citation({ path: "B.md", content: "B " }, "alpha");
  const root = { path: "Master.md", content: "![[B]]" };
  const result = await updateCitationDocument(root, sources, settings, style, codec, resolver([a, b]), 0, false);
  assert.equal(result.sourceCount, 1);
  assert.ok(result.content.includes(bibliographyAnchor("alpha")));
});

test("missing sources keep a previously generated master intact by rejecting the update", async () => {
  const a = citation({ path: "A.md", content: "A " }, "alpha");
  const root = { path: "Master.md", content: "![[A]]" };
  const first = await updateCitationDocument(root, sources, settings, style, codec, resolver([a]), 0, false);
  const saved = first.content;
  await assert.rejects(updateCitationDocument({ ...root, content: saved }, [], settings, style, codec, resolver([a]), 0, true), /Missing bibliography source/u);
  assert.equal(first.content, saved);
});

test("master state survives local citation insertion and repeated updates are idempotent", async () => {
  const a = citation({ path: "A.md", content: "A " }, "alpha");
  const root = { path: "Master.md", content: "![[A]]" };
  const first = await updateCitationDocument(root, sources, settings, style, codec, resolver([a]), 0, true);
  const second = await updateCitationDocument({ ...root, content: first.content }, sources, settings, style, codec, resolver([a]), 0, true);
  assert.equal(second.content, first.content);
  const withLocal = citation({ ...root, content: first.content }, "beta");
  assert.deepEqual(readCitationState(withLocal.content, codec).master, readCitationState(first.content, codec).master);
});

test("local deleted citations prune only local frontmatter entries", () => {
  const note = citation({ path: "Note.md", content: "Text " }, "alpha");
  const removed = note.content.replace(/\[\(alpha[^\n]+$/u, "");
  const updated = rewriteDocumentCitations(removed, sources, codec, () => "unused");
  assert.deepEqual(readCitationState(updated.content, codec).citations, {});
});
