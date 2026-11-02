import assert from "node:assert/strict";
import test from "node:test";
import {
  findBibliographyAnchorOffset,
  renderBibliographyAnchor,
} from "../src/document/bibliography-anchor";

test("renderBibliographyAnchor adds a portable fixed-header offset", () => {
  assert.equal(
    renderBibliographyAnchor("ref-example2026"),
    '<a id="ref-example2026" style="scroll-margin-top: 5rem;"></a>',
  );
});

test("findBibliographyAnchorOffset locates generated anchors exactly", () => {
  const current = `Before\n${renderBibliographyAnchor("ref-example2026")}Example`;

  assert.equal(findBibliographyAnchorOffset(current, "ref-example2026"), current.indexOf("<a "));
  assert.equal(findBibliographyAnchorOffset(current, "ref-other"), -1);
});
