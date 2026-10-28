import assert from "node:assert/strict";
import test from "node:test";
import {
  BIBLIOGRAPHY_END,
  BIBLIOGRAPHY_START,
  updateBibliography,
} from "../src/document/bibliography";
import type { BibliographyItem } from "../src/model/bibliography";

const first = item("first2024", "First source", "Alpha", 2024);
const second = item("second2025", "Second source", "Beta", 2025);

test("updateBibliography follows first citation order and ignores normal links", () => {
  const content = [
    "A [normal link](https://example.com).",
    "Then [(Beta, 2025)](#ref-second2025).",
    "Finally [(Alpha, 2024)](#ref-first2024).",
  ].join("\n\n");
  const result = updateBibliography(content, [first, second], "Literatur", "end", 0);

  assert.deepEqual(result.citedItems.map((entry) => entry.citeKey), ["second2025", "first2024"]);
  assert.ok(result.content.includes(BIBLIOGRAPHY_START));
  assert.ok(result.content.includes(BIBLIOGRAPHY_END));
  assert.ok(result.content.indexOf("Second source") < result.content.indexOf("First source"));
  assert.ok(result.content.includes("[normal link](https://example.com)"));
});

test("updateBibliography replaces only its existing owned block", () => {
  const initial = updateBibliography(
    "Text [(Alpha, 2024)](#ref-first2024).",
    [first],
    "Literatur",
    "end",
    0,
  ).content;
  const updated = updateBibliography(
    initial.replace("Text", "Changed text"),
    [first],
    "References",
    "end",
    0,
  ).content;

  assert.equal(updated.match(new RegExp(BIBLIOGRAPHY_START, "g"))?.length, 1);
  assert.ok(updated.startsWith("Changed text"));
  assert.ok(updated.includes("## References"));
});

function item(citeKey: string, title: string, family: string, year: number): BibliographyItem {
  return {
    citeKey,
    sourcePath: "Literature/library.json",
    csl: {
      id: citeKey,
      type: "article",
      title,
      author: [{ family }],
      issued: { "date-parts": [[year]] },
    },
  };
}
