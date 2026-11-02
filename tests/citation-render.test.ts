import assert from "node:assert/strict";
import test from "node:test";
import {
  bibliographyAnchor,
  renderBibliographyEntry,
  renderMarkdownCitation,
} from "../src/citation/render";
import type { BibliographyItem } from "../src/model/bibliography";

const item: BibliographyItem = {
  citeKey: "Müller 2024",
  sourcePath: "Literature/library.json",
  csl: {
    id: "Müller 2024",
    type: "article-journal",
    title: "A useful article",
    author: [
      { family: "Müller", given: "Anna" },
      { family: "Schmidt", given: "Bernd" },
    ],
    issued: { "date-parts": [[2024]] },
    URL: "https://example.com/article",
  },
};

test("renderMarkdownCitation creates a readable linked citation", () => {
  assert.equal(
    renderMarkdownCitation(item),
    "[(Müller & Schmidt, 2024)](#ref-muller-2024)",
  );
});

test("renderMarkdownCitation includes localized pages and optional text", () => {
  assert.equal(
    renderMarkdownCitation(item, {
      locatorType: "pages",
      locator: "23–27",
      prefix: "vgl.",
      suffix: "Hervorhebung hinzugefügt",
      locale: "de-DE",
    }),
    "[(vgl. Müller & Schmidt, 2024, S. 23–27, Hervorhebung hinzugefügt)](#ref-muller-2024)",
  );
});

test("renderMarkdownCitation supports narrative citations", () => {
  assert.equal(
    renderMarkdownCitation(item, { form: "narrative", locator: "7", locale: "en-US" }),
    "[Müller & Schmidt (2024, p. 7)](#ref-muller-2024)",
  );
});

test("bibliographyAnchor is deterministic and fragment-safe", () => {
  assert.equal(bibliographyAnchor(" Example:2026/A "), "ref-example:2026-a");
});

test("renderBibliographyEntry retains source details", () => {
  assert.match(renderBibliographyEntry(item), /^Müller, Anna, Schmidt, Bernd \(2024\)/);
  assert.match(renderBibliographyEntry(item), /https:\/\/example\.com\/article/);
});
