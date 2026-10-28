import type { EditorPosition } from "obsidian";
import type { BibliographyItem } from "../model/bibliography";
import type { BibliographyPosition } from "../settings-data";
import { bibliographyAnchor, renderBibliographyEntry } from "../citation/render";

export const BIBLIOGRAPHY_START = "<!-- markdown-citations:bibliography:start -->";
export const BIBLIOGRAPHY_END = "<!-- markdown-citations:bibliography:end -->";
export const BIBLIOGRAPHY_PLACEHOLDER = "<!-- markdown-citations:bibliography -->";

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
): BibliographyUpdate {
  const citedItems = citedItemsInDocument(content, items);
  const block = renderBibliographyBlock(citedItems, heading, includeHeading, formattedEntries);
  const existing = existingBibliographyRange(content);

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

  const placeholderIndex = content.indexOf(BIBLIOGRAPHY_PLACEHOLDER);
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
  const citationPattern = /\[[^\]]+\]\(#(ref-[a-z0-9_.:-]+)(?:\s+"[^"]*")?\)/gi;

  for (const match of content.matchAll(citationPattern)) {
    const anchor = match[1]?.toLowerCase();
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
    lines.push(`<a id="${bibliographyAnchor(entry.citeKey)}"></a>${entry.markdown}`, "");
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

function existingBibliographyRange(content: string): { start: number; end: number } | undefined {
  const start = content.indexOf(BIBLIOGRAPHY_START);
  if (start < 0) return undefined;
  const endMarker = content.indexOf(BIBLIOGRAPHY_END, start);
  if (endMarker < 0) return undefined;
  return { start, end: endMarker + BIBLIOGRAPHY_END.length };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
