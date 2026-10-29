import assert from "node:assert/strict";
import test from "node:test";
import type { CSL } from "@citation-js/core";
import {
  EMPTY_LOCAL_REFERENCE,
  buildLocalReference,
  localReferenceInput,
  parseLocalLibrary,
  removeLocalReference,
  serializeLocalLibrary,
  upsertLocalReference,
} from "../src/bibliography/local-library";

const complete = {
  ...EMPTY_LOCAL_REFERENCE,
  citeKey: "mueller2026",
  type: "article-journal" as const,
  title: "A portable reference",
  authors: "Müller, Anna\nOpen Research Group",
  issued: "2026-10-29",
  containerTitle: "Journal of Markdown",
  volume: "12",
  issue: "3",
  pages: "23–41",
  doi: "https://doi.org/10.1234/example",
  accessed: "2026-10",
};

test("local references map editable attributes to portable CSL-JSON", () => {
  const record = buildLocalReference(complete);
  assert.equal(record.id, "mueller2026");
  assert.equal(record["citation-key"], "mueller2026");
  assert.deepEqual(record.author, [
    { family: "Müller", given: "Anna" },
    { literal: "Open Research Group" },
  ]);
  assert.deepEqual(record.issued, { "date-parts": [[2026, 10, 29]] });
  assert.deepEqual(record.accessed, { "date-parts": [[2026, 10]] });
  assert.equal(record.DOI, "10.1234/example");
  assert.equal(record["container-title"], "Journal of Markdown");
  assert.deepEqual(localReferenceInput(record), { ...complete, doi: "10.1234/example" });
});

test("editing keeps unknown CSL attributes while clearing managed blank values", () => {
  const previous = {
    ...buildLocalReference(complete),
    abstract: "Preserve me",
    keyword: "markdown",
  } as CSL;
  const edited = buildLocalReference({ ...complete, issue: "", url: "https://example.org" }, previous);
  assert.equal(edited.abstract, "Preserve me");
  assert.equal(edited.keyword, "markdown");
  assert.equal(edited.issue, undefined);
  assert.equal(edited.URL, "https://example.org");
});

test("local library upserts in place, rejects duplicate keys, and deletes explicitly", () => {
  const first = buildLocalReference(complete);
  const second = buildLocalReference({ ...complete, citeKey: "schmidt2025", title: "Second" });
  const edited = upsertLocalReference([first, second], { ...complete, title: "Updated" }, "mueller2026");
  assert.equal(edited.length, 2);
  assert.equal(edited[0]?.title, "Updated");
  assert.equal(edited[1]?.title, "Second");
  assert.throws(
    () => upsertLocalReference(edited, { ...complete, citeKey: "schmidt2025" }),
    /already exists/,
  );
  assert.deepEqual(removeLocalReference(edited, "mueller2026").map(record => record.id), ["schmidt2025"]);
});

test("local library serialization is stable and malformed input fails clearly", () => {
  const content = serializeLocalLibrary([buildLocalReference(complete)]);
  assert.equal(content.endsWith("\n"), true);
  assert.equal(parseLocalLibrary(content, "Library/MarkdownCitations.json")[0]?.title, "A portable reference");
  assert.throws(() => parseLocalLibrary("{", "Library/broken.json"), /Invalid JSON.*Library\/broken\.json/);
  assert.throws(() => parseLocalLibrary("[{}]", "Library/broken.json"), /has no type/);
  const duplicate = serializeLocalLibrary([buildLocalReference(complete), buildLocalReference(complete)]);
  assert.throws(() => parseLocalLibrary(duplicate, "Library/duplicate.json"), /Duplicate citekey/);
});

test("local reference validation rejects unsafe keys and impossible dates", () => {
  assert.throws(() => buildLocalReference({ ...complete, citeKey: "two words" }), /Citekey/);
  assert.throws(() => buildLocalReference({ ...complete, issued: "2026-02-30" }), /invalid day/);
  assert.throws(() => buildLocalReference({ ...complete, issued: "October 2026" }), /must be YYYY/);
});
