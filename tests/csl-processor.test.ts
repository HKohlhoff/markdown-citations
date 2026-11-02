import assert from "node:assert/strict";
import test from "node:test";
import {
  formatCslBibliography,
  formatCslCitation,
  placeBibliographyUrlOnOwnLine,
} from "../src/csl/processor";
import { getBundledCitationStyle } from "../src/csl/styles";
import { BUNDLED_CSL_LOCALES } from "../src/csl/locales";
import type { BibliographyItem } from "../src/model/bibliography";

const item: BibliographyItem = {
  citeKey: "mueller2024",
  sourcePath: "Literature/library.json",
  csl: {
    id: "mueller2024",
    type: "article-journal",
    title: "A useful article",
    author: [
      { family: "Müller", given: "Anna" },
      { family: "Schmidt", given: "Bernd" },
    ],
    issued: { "date-parts": [[2024]] },
    "container-title": "Journal of Tests",
    volume: "3",
    issue: "2",
    page: "10-20",
    DOI: "10.1000/example",
  },
};

const alphabeticallyFirst: BibliographyItem = {
  citeKey: "adams2023",
  sourcePath: "Literature/library.json",
  csl: {
    id: "adams2023",
    type: "book",
    title: "Earlier in the alphabet",
    author: [{ family: "Adams", given: "Alex" }],
    issued: { "date-parts": [[2023]] },
    publisher: "Example Press",
  },
};

const dehaene: BibliographyItem = {
  citeKey: "dehaeneNumberSenseHow2011",
  sourcePath: "Literature/library.json",
  csl: {
    id: "dehaeneNumberSenseHow2011",
    type: "book",
    title: "The number sense: how the mind creates mathematics",
    author: [{ family: "Dehaene", given: "Stanislas" }],
    issued: { "date-parts": [[2011]] },
    "original-date": { "date-parts": [[1997]] },
    publisher: "Oxford University Press",
    URL: "https://books.google.de/books?id=1p6XWYuwpjUC",
  },
};

const apa = getBundledCitationStyle("apa")?.content;
if (!apa) throw new Error("APA style fixture is unavailable.");

test("citeproc formats a localized citation with a page range", () => {
  const citation = formatCslCitation(
    [item],
    item,
    { locatorType: "pages", locator: "23–27", locale: "de-DE" },
    apa,
    "de-DE",
  );

  assert.match(citation, /Müller/u);
  assert.match(citation, /Schmidt/u);
  assert.match(citation, /2024/u);
  assert.match(citation, /23–27/u);
  assert.doesNotMatch(citation, /<[^>]+>/u);
});

test("citeproc accepts every bundled locale", () => {
  for (const locale of BUNDLED_CSL_LOCALES) {
    const citation = formatCslCitation([item], item, { locator: "3" }, apa, locale.id);
    assert.match(citation, /Müller/u, locale.id);
    assert.match(citation, /2024/u, locale.id);
  }
});

test("citeproc formats a Markdown bibliography entry", () => {
  const entries = formatCslBibliography([item], apa, "de-DE");

  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.citeKey, "mueller2024");
  assert.match(entries[0]?.markdown ?? "", /Müller/u);
  assert.match(entries[0]?.markdown ?? "", /A useful article/u);
  assert.match(entries[0]?.markdown ?? "", /\*Journal of Tests\*/u);
  assert.match(entries[0]?.markdown ?? "", /10\.1000\/example/u);
  assert.match(entries[0]?.markdown ?? "", /\.\x20{2}\nhttps:\/\/doi\.org\/10\.1000\/example$/u);
  assert.doesNotMatch(entries[0]?.markdown ?? "", /<[^>]+>/u);
});

test("bibliography URLs get their own portable Markdown line", () => {
  assert.equal(
    placeBibliographyUrlOnOwnLine("Reference text. [Website](https://example.com/source)"),
    "Reference text.  \n[Website](https://example.com/source)",
  );
  assert.equal(
    placeBibliographyUrlOnOwnLine(
      "Reference text. https://example.com/source (Originally published 1997)",
    ),
    "Reference text.  \nhttps://example.com/source  \n(Originally published 1997)",
  );
});

test("APA keeps the Dehaene URL separate from the original publication date", () => {
  const entries = formatCslBibliography([dehaene], apa, "de-DE");
  assert.match(
    entries[0]?.markdown ?? "",
    /\x20{2}\nhttps:\/\/books\.google\.de\/books\?id=1p6XWYuwpjUC\x20{2}\n\(Ursprünglich erschienen 1997\)$/u,
  );
});

test("DIN access-date separators stay text instead of becoming Markdown list items", () => {
  const markdown = placeBibliographyUrlOnOwnLine(
    "Test Institute: A web page. URL https://example.com/article. - abgerufen am 2026-10-25",
  );
  assert.match(markdown, /\n\\- abgerufen am 2026-10-25/u);
  assert.doesNotMatch(markdown, /^[-+*] /mu);
  assert.equal(placeBibliographyUrlOnOwnLine(markdown), markdown);
});

test("citeproc formats a narrative citation as finished text", () => {
  const citation = formatCslCitation(
    [item],
    item,
    { form: "narrative", locator: "9", locale: "de-DE" },
    apa,
    "de-DE",
  );

  assert.match(citation, /^Müller/u);
  assert.match(citation, /2024/u);
  assert.match(citation, /9/u);
  assert.doesNotMatch(citation, /<[^>]+>/u);
});

test("numeric styles provide readable narrative authors without citeproc sentinel text", () => {
  for (const id of ["ieee", "nlm-citation-sequence", "american-physics-society", "ams-numeric-alphabetical"]) {
    const style = getBundledCitationStyle(id)?.content;
    assert.ok(style);
    const citation = formatCslCitation([dehaene], dehaene,
      { form: "narrative", locator: "3", prefix: "vgl." }, style, "de-DE");
    assert.match(citation, /^vgl\. Dehaene /u);
    assert.match(citation, /1/u);
    assert.doesNotMatch(citation, /NO_PRINTED_FORM/u);
    assert.equal(citation.match(/vgl\./gu)?.length, 1);
  }
});

test("APS preserves citation order while AMS numbers alphabetically sorted references", () => {
  const sources = [item, alphabeticallyFirst];
  const aps = getBundledCitationStyle("american-physics-society")?.content ?? "";
  const ams = getBundledCitationStyle("ams-numeric-alphabetical")?.content ?? "";
  assert.deepEqual(formatCslBibliography(sources, aps, "en-US").map(entry => entry.citeKey), ["mueller2024", "adams2023"]);
  assert.deepEqual(formatCslBibliography(sources, ams, "en-US").map(entry => entry.citeKey), ["adams2023", "mueller2024"]);
  assert.equal(formatCslCitation(sources, item, {}, aps, "en-US"), "[1]");
  assert.equal(formatCslCitation(sources, item, {}, ams, "en-US"), "[2]");
});

test("ISO 690 adaptation retains the 2021 base and switches language-specific terms", () => {
  const style = getBundledCitationStyle("iso690-author-date-localized")?.content ?? "";
  assert.match(style, /ISO 690:2021/u);
  const source: BibliographyItem = {
    citeKey: "online", sourcePath: "library.json",
    csl: { id: "online", type: "webpage", title: "Web publication", author: [{ family: "Author" }],
      issued: { "date-parts": [[2026]] }, accessed: { "date-parts": [[2026, 10, 28]] }, URL: "https://example.com/source" },
  };
  const de = formatCslBibliography([source], style, "de-DE")[0]?.markdown ?? "";
  const en = formatCslBibliography([source], style, "en-US")[0]?.markdown ?? "";
  assert.match(de, /https:\/\/example.com\/source/u);
  assert.match(en, /https:\/\/example.com\/source/u);
  assert.doesNotMatch(de, /Available|accessed/u);
  assert.match(en, /Available|accessed/u);
  assert.notEqual(de, en);
});

test("citeproc returns the bibliography order required by the CSL style", () => {
  const entries = formatCslBibliography([item, alphabeticallyFirst], apa, "de-DE");
  assert.deepEqual(entries.map((entry) => entry.citeKey), ["adams2023", "mueller2024"]);
});
