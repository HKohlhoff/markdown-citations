import { bibliographyAnchor } from "../citation/render";
import { formatCslCitation, formatCslBibliography } from "../csl/processor";
import type { BibliographyItem } from "../model/bibliography";
import type { MarkdownCitationsSettings } from "../settings-data";
import { BIBLIOGRAPHY_START, BIBLIOGRAPHY_END, BIBLIOGRAPHY_PLACEHOLDER, updateBibliography } from "./bibliography";
import { frontmatterRange, readCitationState, writeCitationState, type CitationState, type YamlCodec } from "./citation-frontmatter";
import { excludedDocumentRanges, findDocumentCitations, renderCitationLink, recoverOldCitation } from "./citations";
import { collectMasterCitations, findNoteEmbeddings, type ResolveEmbedding, type SourceNote } from "./master";

export function publicationPath(sourcePath: string): string {
  if (!sourcePath.endsWith(".md")) throw new Error("The publication source must be a Markdown note.");
  return sourcePath.slice(0, -3) + "_publishVersion.md";
}

export function assertPublicationOwnership(content: string, sourcePath: string, codec: YamlCodec): void {
  if (readCitationState(content, codec).publication?.source !== sourcePath) {
    throw new Error("The existing file was not generated for this master and will not be overwritten.");
  }
}

/** Assemble independently before writing anything. Every occurrence receives its own ID. */
export async function buildPublication(
  root: SourceNote, sources: readonly BibliographyItem[], settings: MarkdownCitationsSettings,
  style: string, codec: YamlCodec, resolve: ResolveEmbedding,
  rebaseLinks: (content: string, sourcePath: string) => string = content => content,
): Promise<{ content: string; sourceCount: number; citationCount: number; documents: string[] }> {
  if (readCitationState(root.content, codec).publication) throw new Error("Run this command in the original master, not its publication version.");
  const collection = await collectMasterCitations(root, sources, codec, resolve);
  if (collection.unresolvedDetails) throw new Error("Some citation details cannot be recovered. Update the source citations before publishing.");
  const byAnchor = new Map(sources.map(item => [bibliographyAnchor(item.citeKey), item]));
  const state: CitationState = {
    version: 1, style: settings.defaultCitationStyle, locale: settings.defaultLocale,
    publication: { source: root.path }, citations: {},
  };
  let counter = 0;
  let expansions = 0;
  let expandedSize = 0;

  async function expand(note: SourceNote, start: number, end: number, rootNote: boolean, ancestors: string[]): Promise<string> {
    const identity = JSON.stringify([note.path, start, end]);
    if (ancestors.includes(identity)) throw new Error(`Cyclic note embedding involving ${note.path}.`);
    if (ancestors.length >= 32 || ++expansions > 1000) throw new Error("The publication exceeds the safe embedding limit.");
    const details = readCitationState(note.content, codec).citations;
    const replacements: { start: number; end: number; text: string }[] = [];
    const excluded = excludedDocumentRanges(note.content);
    for (const marker of note.content.matchAll(/(?:[ \t]+|^)\^[a-z\d-]+[ \t]*(?=\r?$)/gimu)) {
      if (!excluded.some(([from, to]) => marker.index >= from && marker.index < to)) {
        replacements.push({ start: marker.index, end: marker.index + marker[0].length, text: "" });
      }
    }
    const frontmatter = frontmatterRange(note.content);
    if (!rootNote && frontmatter) replacements.push({ start: 0, end: frontmatter.bodyStart, text: "" });
    const bibStart = note.content.indexOf(BIBLIOGRAPHY_START);
    if (bibStart >= 0) {
      const bibEnd = note.content.indexOf(BIBLIOGRAPHY_END, bibStart);
      if (bibEnd < 0) throw new Error(`Unclosed bibliography in ${note.path}.`);
      replacements.push({ start: bibStart, end: bibEnd + BIBLIOGRAPHY_END.length, text: rootNote ? BIBLIOGRAPHY_PLACEHOLDER : "" });
    }
    const events = [
      ...findDocumentCitations(note.content).map(citation => ({ start: citation.start, end: citation.end, citation, embed: undefined })),
      ...findNoteEmbeddings(note.content).map(embed => ({ start: embed.start, end: embed.end, citation: undefined, embed })),
    ].filter(event => event.start >= start && event.end <= end).sort((a, b) => a.start - b.start);
    for (const event of events) {
      if (event.embed) {
        const embedded = await resolve(event.embed.target, note.path);
        if (!embedded) continue;
        const range = embedded.range ?? { start: 0, end: embedded.note.content.length };
        const text = await expand(embedded.note, range.start, range.end, false, [...ancestors, identity]);
        replacements.push({ start: event.start, end: event.end, text: `\n\n${text.trim()}\n\n` });
      } else if (event.citation) {
        const citation = event.citation;
        const item = byAnchor.get(citation.anchor);
        if (!item) throw new Error(`Missing source: ${citation.anchor}.`);
        const stored = citation.id ? details[citation.id] : citation.legacy ?? recoverOldCitation(citation.label, item);
        if (!stored) throw new Error(`Missing citation details in ${note.path}.`);
        if (++counter > 10000) throw new Error("The publication exceeds the citation limit.");
        const id = `c${counter}`;
        state.citations[id] = { ...stored };
        const label = formatCslCitation(collection.items, item, stored, style, settings.defaultLocale);
        replacements.push({ start: event.start, end: event.end, text: renderCitationLink(label, item.citeKey, id) });
      }
    }
    const edits = replacements.filter(edit => edit.start >= start && edit.end <= end).sort((a, b) => a.start - b.start);
    let cursor = start;
    const parts: string[] = [];
    for (const edit of edits) {
      if (edit.start < cursor) throw new Error(`Overlapping publication edits in ${note.path}.`);
      parts.push(rebaseLinks(note.content.slice(cursor, edit.start), note.path), edit.text);
      cursor = edit.end;
    }
    parts.push(rebaseLinks(note.content.slice(cursor, end), note.path));
    const expanded = parts.join("");
    expandedSize += expanded.length;
    if (expandedSize > 20_000_000) throw new Error("The publication exceeds the safe size limit.");
    return expanded;
  }

  const assembled = await expand(root, 0, root.content.length, true, []);
  const content = writeCitationState(assembled, state, codec);
  const bibliography = updateBibliography(content, sources, settings.bibliographyHeading,
    settings.includeBibliographyHeading, "end", content.length,
    formatCslBibliography(collection.items, style, settings.defaultLocale), collection.items);
  return { content: bibliography.content, sourceCount: collection.items.length, citationCount: counter, documents: collection.documents };
}
