import { bibliographyAnchor } from "../citation/render";
import type { BibliographyItem } from "../model/bibliography";
import { readCitationState, type MasterCitationRecord, type StoredCitation, type YamlCodec } from "./citation-frontmatter";
import { excludedDocumentRanges, findDocumentCitations, recoverOldCitation, type DocumentCitation } from "./citations";

export interface SourceNote { path: string; content: string }
export interface NoteEmbedding { start: number; end: number; target: string }
export interface ResolvedNote {
  note: SourceNote;
  range?: { start: number; end: number };
}
export type ResolveEmbedding = (target: string, sourcePath: string) => Promise<ResolvedNote | null>;
export interface MasterCollection {
  items: BibliographyItem[];
  documents: string[];
  citations: MasterCitationRecord[];
  hasEmbeddings: boolean;
  unresolvedDetails: number;
}

/** Only note embeds in visible Markdown participate, not normal wikilinks or examples. */
export function findNoteEmbeddings(content: string): NoteEmbedding[] {
  const excluded = excludedDocumentRanges(content);
  const result: NoteEmbedding[] = [];
  for (const match of content.matchAll(/!\[\[([^\]\n]+)\]\]/gu)) {
    if (excluded.some(([start, end]) => match.index >= start && match.index < end)) continue;
    const target = match[1]?.split("|")[0]?.trim();
    if (target) result.push({ start: match.index, end: match.index + match[0].length, target });
  }
  return result;
}

/** Read-only depth-first expansion in rendered reading order. Incomplete graphs abort. */
export async function collectMasterCitations(
  root: SourceNote, sources: readonly BibliographyItem[], codec: YamlCodec, resolve: ResolveEmbedding,
): Promise<MasterCollection> {
  const byAnchor = new Map<string, BibliographyItem>();
  for (const item of sources) {
    const anchor = bibliographyAnchor(item.citeKey);
    if (byAnchor.has(anchor)) throw new Error(`Ambiguous citation anchor: ${anchor}`);
    byAnchor.set(anchor, item);
  }
  const result: MasterCollection = { items: [], documents: [], citations: [], hasEmbeddings: false, unresolvedDetails: 0 };
  const seenItems = new Set<string>();
  const seenDocuments = new Set<string>();
  const records = new Map<string, MasterCitationRecord>();
  const parsed = new Map<string, { citations: DocumentCitation[]; embeds: NoteEmbedding[]; details: Record<string, StoredCitation> }>();
  let expansions = 0;

  async function visit(note: SourceNote, range: { start: number; end: number }, ancestors: string[]): Promise<void> {
    const identity = JSON.stringify([note.path, range.start, range.end]);
    if (ancestors.includes(identity)) throw new Error(`Cyclic note embedding involving ${note.path}.`);
    if (ancestors.length >= 32 || ++expansions > 1000) throw new Error("The master exceeds the safe embedding depth or expansion limit.");
    let data = parsed.get(note.path);
    if (!data) {
      data = { citations: findDocumentCitations(note.content), embeds: findNoteEmbeddings(note.content), details: readCitationState(note.content, codec).citations };
      parsed.set(note.path, data);
    }
    const events = [
      ...data.citations.map(citation => ({ start: citation.start, end: citation.end, citation, embed: undefined })),
      ...data.embeds.map(embed => ({ start: embed.start, end: embed.end, embed, citation: undefined })),
    ].filter(event => event.start >= range.start && event.end <= range.end).sort((a, b) => a.start - b.start);
    for (const event of events) {
      if (event.embed) {
        const embedded = await resolve(event.embed.target, note.path);
        if (!embedded) continue; // Non-Markdown assets do not contribute citations.
        result.hasEmbeddings = true;
        if (!seenDocuments.has(embedded.note.path)) {
          seenDocuments.add(embedded.note.path);
          result.documents.push(embedded.note.path);
        }
        await visit(embedded.note, embedded.range ?? { start: 0, end: embedded.note.content.length }, [...ancestors, identity]);
        continue;
      }
      const citation = event.citation;
      if (!citation) continue;
      const item = byAnchor.get(citation.anchor);
      const stored = citation.id ? data.details[citation.id] : citation.legacy;
      if (citation.id && !stored) throw new Error(`Missing citation ${citation.id} in ${note.path}.`);
      if (stored && bibliographyAnchor(stored.citeKey) !== citation.anchor) throw new Error(`Citation data and link disagree in ${note.path}.`);
      if (!item) throw new Error(`Missing bibliography source for ${citation.anchor} in ${note.path}.`);
      if (!seenItems.has(item.citeKey)) { result.items.push(item); seenItems.add(item.citeKey); }
      const details = stored ?? recoverOldCitation(citation.label, item);
      if (!details) result.unresolvedDetails += 1;
      const citationId = citation.id ?? `offset-${citation.start}`;
      const recordKey = JSON.stringify([note.path, citationId]);
      const previous = records.get(recordKey);
      if (previous) previous.occurrences += 1;
      else {
        const record: MasterCitationRecord = {
          ...(details ?? { citeKey: item.citeKey }), sourcePath: note.path, citationId, occurrences: 1,
        };
        records.set(recordKey, record);
        result.citations.push(record);
      }
      if (result.citations.length > 10000) throw new Error("The master exceeds the citation limit.");
    }
  }

  await visit(root, { start: 0, end: root.content.length }, []);
  return result;
}
