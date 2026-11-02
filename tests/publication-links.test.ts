import assert from "node:assert/strict";
import test from "node:test";
import { rebasePublicationLinks } from "../src/document/publication-links";

const rebase = (text: string): string => rebasePublicationLinks(text, "Book/Chapters/First.md", "Book/Master_publishVersion.md", target => ({
  "image.png": "Book/Chapters/image.png", "Other": "Notes/Other.md", "other.md": "Notes/Other.md",
  "figure one.png": "Assets/figure one.png",
} as Record<string, string>)[target]);

test("publication links from nested folders resolve relative to the output without losing labels or titles", () => {
  assert.equal(rebase('![Image](image.png "Caption")'), '![Image](Chapters/image.png "Caption")');
  assert.equal(rebase('[Other](other.md#Part)'), '[Other](../Notes/Other.md#Part)');
  assert.equal(rebase('![[image.png|300]] [[Other#Part|Name]]'), '![[Book/Chapters/image.png|300]] [[Notes/Other.md#Part|Name]]');
  assert.equal(rebase('![Figure](<figure one.png>)'), '![Figure](<../Assets/figure%20one.png>)');
});

test("publication rebasing preserves external, fragment, and unresolved links", () => {
  const text = '[Web](https://example.org/image.png) [Mail](mailto:a@example.org) [Citation](#ref-alpha "mc:c1") [[#Section]] [Unknown](missing.png)';
  assert.equal(rebase(text), text);
});

test("publication rebasing ignores code, frontmatter, and HTML comments", () => {
  const text = '---\nexample: "[[Other]]"\n---\n`[[Other]]`\n```md\n![Image](image.png)\n```\n<!-- [[Other]] -->';
  assert.equal(rebase(text), text);
});
