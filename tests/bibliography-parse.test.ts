import assert from "node:assert/strict";
import test from "node:test";
import { parseBibliography } from "../src/bibliography/parse";

test("parseBibliography normalizes BibLaTeX to CSL data", () => {
  const items = parseBibliography(`
    @article{mueller2024,
      author = {Müller, Anna and Schmidt, Bernd},
      title = {Ein Testartikel},
      journaltitle = {Zeitschrift für Tests},
      date = {2024},
      url = {https://example.com/test}
    }
  `, "Literature/library.bib");

  assert.equal(items.length, 1);
  assert.equal(items[0]?.citeKey, "mueller2024");
  assert.equal(items[0]?.csl.title, "Ein Testartikel");
  assert.equal(items[0]?.csl.author?.[0]?.family, "Müller");
  assert.equal(items[0]?.csl.issued?.["date-parts"]?.[0]?.[0], 2024);
});

test("parseBibliography accepts CSL-JSON arrays", () => {
  const items = parseBibliography(JSON.stringify([{
    id: "web2026",
    type: "webpage",
    title: "A useful page",
    author: [{ family: "Example", given: "Eva" }],
    issued: { "date-parts": [[2026]] },
  }]), "Literature/library.json");

  assert.equal(items.length, 1);
  assert.equal(items[0]?.citeKey, "web2026");
  assert.equal(items[0]?.csl.type, "webpage");
});

test("parseBibliography reports invalid JSON with its source path", () => {
  assert.throws(
    () => parseBibliography("{", "Literature/broken.json"),
    /Literature\/broken\.json.*Invalid JSON/,
  );
});
