import { bibliographyAnchor, type CitationRenderOptions } from "../citation/render";
import type { BibliographyItem } from "../model/bibliography";
import {
  frontmatterRange, readCitationState, writeCitationState, validateStoredCitation,
  type CitationState, type StoredCitation, type YamlCodec,
} from "./citation-frontmatter";

export interface DocumentCitation {
  start: number;
  end: number;
  label: string;
  anchor: string;
  id?: string;
  legacy?: StoredCitation;
}

export function renderCitationLink(label: string, citeKey: string, id: string): string {
  const escapedLabel = label.replace(/\\/gu, "\\\\").replace(/\[/gu, "\\[").replace(/\]/gu, "\\]");
  return `[${escapedLabel}](#${bibliographyAnchor(citeKey)} "mc:${id}")`;
}

export function findDocumentCitations(content: string): DocumentCitation[] {
  const excluded = excludedDocumentRanges(content);
  const pattern = /\[((?:\\[^\n]|[^\u005B\u005D\\\n]|\u005B[^\u005D\n]*\u005D)*)\]\(#(ref-[a-z0-9_.:-]+)(?: "mc:(c[a-z0-9]+)")?\)(?:<!-- markdown-citations:cite:([^>\s]+) -->)?/giu;
  const citations: DocumentCitation[] = [];
  for (const match of content.matchAll(pattern)) {
    if (excluded.some(([start, end]) => match.index >= start && match.index < end)) continue;
    let legacy: StoredCitation | undefined;
    if (match[4]) {
      // Invalid comments abort the operation rather than losing citation details.
      const decoded: unknown = JSON.parse(decodeURIComponent(match[4]));
      legacy = validateStoredCitation(decoded);
      if (bibliographyAnchor(legacy.citeKey) !== match[2]?.toLowerCase()) throw new Error("Citation comment and link disagree.");
    }
    citations.push({
      start: match.index,
      end: match.index + match[0].length,
      label: (match[1] ?? "").replace(/\\([\\\u005B\u005D])/gu, "$1"),
      anchor: (match[2] ?? "").toLowerCase(),
      id: match[3],
      legacy,
    });
  }
  return citations;
}

export function insertCitation(
  content: string, from: number, to: number, label: string,
  citeKey: string, options: CitationRenderOptions, codec: YamlCodec,
): string {
  const state = readCitationState(content, codec);
  const frontmatter = frontmatterRange(content);
  if (frontmatter && from < frontmatter.bodyStart) throw new Error("Place the cursor in the note body before inserting a citation.");
  const id = addCitation(state, validateStoredCitation({ citeKey, ...options }));
  const body = content.slice(0, from) + renderCitationLink(label, citeKey, id) + content.slice(to);
  return writeCitationState(body, state, codec);
}

export function rewriteDocumentCitations(
  content: string,
  items: readonly BibliographyItem[],
  codec: YamlCodec,
  renderLabel: (item: BibliographyItem, details: StoredCitation) => string,
  cursorOffset = content.length,
): { content: string; updated: number; skipped: number; migrated: number; cursorOffset: number } {
  const state = readCitationState(content, codec);
  const byAnchor = new Map<string, BibliographyItem>();
  for (const item of items) {
    const anchor = bibliographyAnchor(item.citeKey);
    if (byAnchor.has(anchor)) throw new Error(`Ambiguous citation anchor: ${anchor}`);
    byAnchor.set(anchor, item);
  }
  let rewritten = content;
  let updated = 0;
  let skipped = 0;
  let migrated = 0;
  let mappedCursor = cursorOffset;
  // Render in document order, then apply replacements backwards to preserve offsets.
  const replacements = findDocumentCitations(content).map((citation) => {
    const item = byAnchor.get(citation.anchor);
    let details = citation.id ? state.citations[citation.id] : citation.legacy;
    if (citation.id && !details) throw new Error(`Missing frontmatter data for ${citation.id}.`);
    if (details && bibliographyAnchor(details.citeKey) !== citation.anchor) throw new Error("Citation frontmatter and link disagree.");
    if (!details && item) details = recoverOldCitation(citation.label, item);
    if (!details) { skipped += 1; return { citation, replacement: undefined }; }
    let id = citation.id;
    if (!id) { id = addCitation(state, details); migrated += 1; }
    const label = item ? renderLabel(item, details) : citation.label;
    if (item) updated += 1;
    else skipped += 1;
    return { citation, replacement: renderCitationLink(label, details.citeKey, id) };
  });
  for (const { citation, replacement } of replacements.reverse()) {
    if (replacement !== undefined) {
      if (cursorOffset >= citation.end) mappedCursor += replacement.length - (citation.end - citation.start);
      else if (cursorOffset > citation.start) mappedCursor = citation.start + replacement.length;
      rewritten = rewritten.slice(0, citation.start) + replacement + rewritten.slice(citation.end);
    }
  }
  const liveIds = new Set(findDocumentCitations(rewritten).map(citation => citation.id));
  let pruned = false;
  for (const id of Object.keys(state.citations)) {
    if (!liveIds.has(id)) { delete state.citations[id]; pruned = true; }
  }
  if (updated > 0 || migrated > 0 || pruned) {
    const withFrontmatter = writeCitationState(rewritten, state, codec);
    mappedCursor += withFrontmatter.length - rewritten.length;
    rewritten = withFrontmatter;
  }
  mappedCursor = Math.max(frontmatterRange(rewritten)?.bodyStart ?? 0, Math.min(mappedCursor, rewritten.length));
  return { content: rewritten, updated, skipped, migrated, cursorOffset: mappedCursor };
}

function addCitation(state: CitationState, details: StoredCitation): string {
  let number = 1;
  while (Object.prototype.hasOwnProperty.call(state.citations, `c${number}`)) number += 1;
  const id = `c${number}`;
  state.citations[id] = details;
  return id;
}

/** Older plain prototype links can be adopted when the visible details are clear. */
export function recoverOldCitation(label: string, item: BibliographyItem): StoredCitation | undefined {
  const form = label.startsWith("(") || label.startsWith("[") ? "parenthetical" : "narrative";
  if (/^\[?\d+\]?$/u.test(label)) return { citeKey: item.citeKey };
  const year = /(?:\d{4}(?:\/\d{4})?[a-z]?|n\.d\.|o\.\s?J\.)/u.exec(label);
  if (!year) return undefined;
  const before = label.slice(0, year.index);
  const knownPrefix = before.match(/^[([]?\s*(vgl\.|siehe|see|cf\.)\s+/iu)?.[1];
  const authorStart = before.replace(/^[([]?\s*/u, "")
    .replace(/^(?:vgl\.|siehe|see|cf\.)\s+/iu, "").toLowerCase();
  const firstAuthor = item.csl.author?.[0];
  const expected = firstAuthor?.family || firstAuthor?.literal || firstAuthor?.given || item.csl.title;
  if (!expected || !authorStart.startsWith(expected.toLowerCase())) return undefined;
  const after = label.slice(year.index + year[0].length).replace(/[)\]]$/u, "").trim();
  const result: StoredCitation = { citeKey: item.citeKey, form, ...(knownPrefix ? { prefix: knownPrefix } : {}) };
  if (!after) return result;
  const page = /^[,;:]\s*(?:S\.|pp?\.)\s*([\d–—\-\s]+)(?:,\s*(.+))?$/u.exec(after);
  if (!page?.[1]) return undefined;
  return { ...result, locatorType: "page", locator: page[1].trim(), ...(page[2] ? { suffix: page[2] } : {}) };
}

export function excludedDocumentRanges(content: string): [number, number][] {
  const ranges: [number, number][] = [];
  const frontmatter = frontmatterRange(content);
  if (frontmatter) ranges.push([0, frontmatter.bodyStart]);
  const endMarker = "<!-- markdown-citations:bibliography:end -->";
  const blockStart = content.indexOf("<!-- markdown-citations:bibliography:start -->");
  const blockEnd = content.indexOf(endMarker, blockStart);
  if (blockStart >= 0 && blockEnd >= 0) ranges.push([blockStart, blockEnd + endMarker.length]);
  // Mask fenced code line by line, including fences longer than the opening fence.
  let fence: { char: string; length: number; start: number } | undefined;
  for (const line of content.matchAll(/^.*(?:\n|$)/gmu)) {
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/u.exec(line[0].trimEnd());
    if (!marker?.[1]) continue;
    if (!fence) fence = { char: marker[1][0] ?? "`", length: marker[1].length, start: line.index };
    else if (marker[1][0] === fence.char && marker[1].length >= fence.length && !marker[2]?.trim()) {
      ranges.push([fence.start, line.index + line[0].length]);
      fence = undefined;
    }
  }
  if (fence) ranges.push([fence.start, content.length]);
  for (const match of content.matchAll(/(`+)[\s\S]*?\1|<!--[\s\S]*?-->/gu)) ranges.push([match.index, match.index + match[0].length]);
  return ranges;
}
