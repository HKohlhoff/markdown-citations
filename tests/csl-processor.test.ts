import assert from "node:assert/strict";
import test from "node:test";
import {
  formatCslBibliography,
  formatCslCitation,
  placeBibliographyUrlOnOwnLine,
} from "../src/csl/processor";
import { getBundledCitationStyle } from "../src/csl/styles";
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

test("citeproc returns the bibliography order required by the CSL style", () => {
  const entries = formatCslBibliography([item, alphabeticallyFirst], apa, "de-DE");
  assert.deepEqual(entries.map((entry) => entry.citeKey), ["adams2023", "mueller2024"]);
});
