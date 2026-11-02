import type { EditorPosition } from "obsidian";
import type { BibliographyItem } from "../model/bibliography";
import type { BibliographyPosition } from "../settings-data";
import { bibliographyAnchor, renderBibliographyEntry } from "../citation/render";
import { findDocumentCitations } from "./citations";
import { renderBibliographyAnchor } from "./bibliography-anchor";
import { BIBLIOGRAPHY_START, BIBLIOGRAPHY_END, BIBLIOGRAPHY_PLACEHOLDER, bibliographyRange, bibliographyPlaceholder } from "./markdown-ranges";
export { BIBLIOGRAPHY_START, BIBLIOGRAPHY_END, BIBLIOGRAPHY_PLACEHOLDER };

export interface BibliographyUpdate {
  content: string;
  insertedAt?: EditorPosition;
  citedItems: BibliographyItem[];
}

export interface FormattedBibliographyText {
  citeKey: string;
  markdown: string;
}

export function updateBibliography(
  content: string,
  items: readonly BibliographyItem[],
  heading: string,
  includeHeading: boolean,
  position: BibliographyPosition,
  cursorOffset: number,
  formattedEntries?: readonly FormattedBibliographyText[],
  collectedItems?: readonly BibliographyItem[],
): BibliographyUpdate {
  const citedItems = collectedItems ? [...collectedItems] : citedItemsInDocument(content, items);
  const block = renderBibliographyBlock(citedItems, heading, includeHeading, formattedEntries);
  const existing = bibliographyRange(content);

  if (existing) {
    return {
      content: joinBibliographyBlock(
        content.slice(0, existing.start),
        block,
        content.slice(existing.end),
      ),
      citedItems,
    };
  }

  const placeholderIndex = bibliographyPlaceholder(content);
  if (placeholderIndex >= 0) {
    return {
      content: joinBibliographyBlock(
        content.slice(0, placeholderIndex),
        block,
        content.slice(placeholderIndex + BIBLIOGRAPHY_PLACEHOLDER.length),
      ),
      citedItems,
    };
  }

  const insertionOffset = position === "end" ? content.length : clamp(cursorOffset, 0, content.length);
  return {
    content: joinBibliographyBlock(
      content.slice(0, insertionOffset),
      block,
      content.slice(insertionOffset),
    ),
    citedItems,
  };
}

export function citedItemsInDocument(
  content: string,
  items: readonly BibliographyItem[],
): BibliographyItem[] {
  const byAnchor = new Map(items.map((item) => [bibliographyAnchor(item.citeKey), item]));
  const result: BibliographyItem[] = [];
  const seen = new Set<string>();
  for (const citation of findDocumentCitations(content)) {
    const anchor = citation.anchor;
    if (!anchor || seen.has(anchor)) continue;
    const item = byAnchor.get(anchor);
    if (!item) continue;
    seen.add(anchor);
    result.push(item);
  }
  return result;
}

function renderBibliographyBlock(
  items: readonly BibliographyItem[],
  heading: string,
  includeHeading: boolean,
  formattedEntries?: readonly FormattedBibliographyText[],
): string {
  const lines = [BIBLIOGRAPHY_START, ""];
  if (includeHeading) lines.push(`## ${heading.trim() || "Literature"}`, "");
  const entries = formattedEntries ?? items.map((item) => ({
    citeKey: item.citeKey,
    markdown: renderBibliographyEntry(item),
  }));
  for (const entry of entries) {
    lines.push(`${renderBibliographyAnchor(bibliographyAnchor(entry.citeKey))}${entry.markdown}`, "");
  }
  if (entries.length === 0) lines.push("_No Markdown Citations references found._");
  if (lines[lines.length - 1] !== "") lines.push("");
  lines.push(BIBLIOGRAPHY_END);
  return lines.join("\n");
}

function joinBibliographyBlock(before: string, block: string, after: string): string {
  const normalizedBefore = before.replace(/[\t ]*(?:\r?\n[\t ]*)+$/u, "");
  const normalizedAfter = after.replace(/^(?:[\t ]*\r?\n)+[\t ]*/u, "");
  const prefix = normalizedBefore ? "\n\n" : "";
  const suffix = normalizedAfter ? "\n\n" : "\n";
  return normalizedBefore + prefix + block + suffix + normalizedAfter;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
