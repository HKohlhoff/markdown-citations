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
  const result = updateBibliography(content, [first, second], "Literatur", true, "end", 0);

  assert.deepEqual(result.citedItems.map((entry) => entry.citeKey), ["second2025", "first2024"]);
  assert.ok(result.content.includes(BIBLIOGRAPHY_START));
  assert.ok(result.content.includes(BIBLIOGRAPHY_END));
  assert.ok(result.content.includes(`${BIBLIOGRAPHY_START}\n\n## Literatur`));
  assert.ok(result.content.indexOf("Second source") < result.content.indexOf("First source"));
  assert.ok(result.content.includes("Second source*.\n\n<a id=\"ref-first2024\" style=\"scroll-margin-top: 5rem;\"></a>Alpha (2024). *First source") );
  assert.ok(result.content.includes("[normal link](https://example.com)"));
});

test("updateBibliography recognizes nested numeric citation labels", () => {
  const result = updateBibliography(
    "Numeric [[1]](#ref-first2024).",
    [first],
    "References",
    true,
    "end",
    0,
  );

  assert.deepEqual(result.citedItems.map((entry) => entry.citeKey), ["first2024"]);
  assert.ok(result.content.includes("<a id=\"ref-first2024\" style=\"scroll-margin-top: 5rem;\"></a>"));
});

test("updateBibliography replaces only its existing owned block", () => {
  const initial = updateBibliography(
    "Text [(Alpha, 2024)](#ref-first2024).",
    [first],
    "Literatur",
    true,
    "end",
    0,
  ).content;
  const updated = updateBibliography(
    initial.replace("Text", "Changed text"),
    [first],
    "References",
    true,
    "end",
    0,
  ).content;

  assert.equal(updated.match(new RegExp(BIBLIOGRAPHY_START, "g"))?.length, 1);
  assert.ok(updated.startsWith("Changed text"));
  assert.ok(updated.includes("## References"));
});

test("updateBibliography can omit the heading and renders entries as paragraphs", () => {
  const result = updateBibliography(
    "Text [(Alpha, 2024)](#ref-first2024).",
    [first],
    "Literatur",
    false,
    "end",
    0,
  );

  assert.ok(!result.content.includes("## Literatur"));
  assert.ok(!result.content.includes("\n- Alpha"));
  assert.ok(result.content.includes("\n<a id=\"ref-first2024\" style=\"scroll-margin-top: 5rem;\"></a>Alpha (2024)."));
});

test("updateBibliography automatically uses a placeholder", () => {
  const content = [
    "Text [(Alpha, 2024)](#ref-first2024).",
    "<!-- markdown-citations:bibliography -->",
    "After",
  ].join("\n\n");
  const result = updateBibliography(content, [first], "Literatur", true, "end", 0);

  assert.ok(result.content.indexOf(BIBLIOGRAPHY_START) < result.content.indexOf("After"));
  assert.ok(!result.content.includes("<!-- markdown-citations:bibliography -->"));
});

test("updateBibliography normalizes surrounding blank and whitespace-only lines", () => {
  const content = "Before\n \n\nAfter [(Alpha, 2024)](#ref-first2024).";
  const result = updateBibliography(content, [first], "Literatur", false, "cursor", 10);

  assert.ok(result.content.includes(`Before\n\n${BIBLIOGRAPHY_START}`));
  assert.ok(!result.content.includes(`Before\n \n${BIBLIOGRAPHY_START}`));
  assert.ok(result.content.includes(`${BIBLIOGRAPHY_END}\n\nAfter`));
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

test("bibliography markers and placeholders inside code examples are never output targets", () => {
  const example = `\n\`\`\`md\n${BIBLIOGRAPHY_START}\nExample\n${BIBLIOGRAPHY_END}\n<!-- markdown-citations:bibliography -->\n\`\`\`\n`;
  const text = example + "Text [(Alpha, 2024)](#ref-first2024).";
  const result = updateBibliography(text, [first], "Literatur", true, "end", 0).content;
  assert.ok(result.startsWith(example));
  assert.equal(result.split(BIBLIOGRAPHY_START).length - 1, 2);
  assert.ok(result.indexOf('<a id="ref-first2024"') > result.indexOf("Text [(Alpha"));
});

test("incomplete and duplicated bibliography blocks stop before replacing note text", () => {
  for (const text of [BIBLIOGRAPHY_START, BIBLIOGRAPHY_END,
    `${BIBLIOGRAPHY_START}\n${BIBLIOGRAPHY_END}\n${BIBLIOGRAPHY_START}\n${BIBLIOGRAPHY_END}`]) {
    assert.throws(() => updateBibliography(text, [first], "Literatur", true, "end", 0), /ownership markers/u);
  }
});
