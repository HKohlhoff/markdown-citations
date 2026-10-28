import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { README_MARKDOWN, LAST_UPDATE_MARKDOWN, prepareReadmeMarkdown } from "../src/ui/documentation-content";

test("bundled About documents come directly from repository files and match the manifest version", () => {
  assert.equal(README_MARKDOWN, fs.readFileSync("README.md", "utf8"));
  assert.equal(LAST_UPDATE_MARKDOWN, fs.readFileSync("Last Update.md", "utf8"));
  const manifest: unknown = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
  assert.ok(typeof manifest === "object" && manifest !== null && "version" in manifest);
  assert.ok(LAST_UPDATE_MARKDOWN.startsWith(`# Markdown Citations ${String(manifest.version)} `));
});

test("embedded README removes images but retains support and relative documentation links", () => {
  const prepared = prepareReadmeMarkdown([
    '# Help', '', '![Screenshot](images/screen.png)', '', '',
    '<a href="https://ko-fi.com/hokdev"><img src="https://example.com/button.png"></a>',
    '<img src="images/another.png">', '',
    '[Concept](KONZEPT.md#goal)', '[External](https://example.com)', '[Here](#local)',
  ].join("\n"));
  assert.doesNotMatch(prepared, /<img|!\[|Screenshot|\n{3}/u);
  assert.match(prepared, /\[Support this plugin on Ko-fi\]\(https:\/\/ko-fi.com\/hokdev\)/u);
  assert.match(prepared, /\/blob\/develop\/KONZEPT.md#goal/u);
  assert.ok(prepared.includes('[External](https://example.com)'));
  assert.ok(prepared.includes('[Here](#local)'));
});

test("both About documents state master limitations rather than implying rewritten chapters", () => {
  assert.match(README_MARKDOWN, /not yet globally renumbered/u);
  assert.match(LAST_UPDATE_MARKDOWN, /not yet reformatted or\nglobally renumbered/u);
  assert.match(README_MARKDOWN, /Removing an embed/u);
  assert.match(LAST_UPDATE_MARKDOWN, /Remove an embed/u);
  for (const content of [README_MARKDOWN, LAST_UPDATE_MARKDOWN]) {
    assert.match(content, /Create \/ update publication note/u);
    assert.match(content, /Master_publishVersion\.md/u);
  }
});
