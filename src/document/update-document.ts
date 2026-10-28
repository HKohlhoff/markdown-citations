import { formatCslBibliography, formatCslCitation } from "../csl/processor";
import type { BibliographyItem } from "../model/bibliography";
import type { MarkdownCitationsSettings } from "../settings-data";
import { citedItemsInDocument, updateBibliography } from "./bibliography";
import { readCitationState, writeCitationState, type YamlCodec } from "./citation-frontmatter";
import { rewriteDocumentCitations } from "./citations";
import { collectMasterCitations, findNoteEmbeddings, type ResolveEmbedding, type SourceNote } from "./master";

/** Build a complete replacement before the caller commits a single editor change. */
export async function updateCitationDocument(
  root: SourceNote,
  sources: readonly BibliographyItem[],
  settings: MarkdownCitationsSettings,
  style: string,
  codec: YamlCodec,
  resolve: (root: SourceNote) => ResolveEmbedding,
  cursorOffset: number,
  reformatCitations: boolean,
): Promise<{ content: string; updated: number; skipped: number; sourceCount: number; chapterCount: number; isMaster: boolean }> {
  const originalState = readCitationState(root.content, codec);
  const mightBeMaster = Boolean(originalState.master) || findNoteEmbeddings(root.content).length > 0;
  let collection = mightBeMaster ? await collectMasterCitations(root, sources, codec, resolve(root)) : undefined;
  let orderedItems = collection?.items ?? citedItemsInDocument(root.content, sources);
  let content = root.content;
  let cursor = cursorOffset;
  let updated = 0;
  let skipped = 0;
  if (reformatCitations) {
    const change = rewriteDocumentCitations(content, sources, codec,
      (item, details) => formatCslCitation(orderedItems, item, details, style, settings.defaultLocale), cursor);
    content = change.content;
    cursor = change.cursorOffset;
    updated = change.updated;
    skipped = change.skipped;
  }
  const isMaster = Boolean(originalState.master) || Boolean(collection?.hasEmbeddings);
  if (isMaster) {
    const rewrittenRoot = { path: root.path, content };
    // Re-scan after adopting old root citations, so the index uses the new IDs.
    collection = await collectMasterCitations(rewrittenRoot, sources, codec, resolve(rewrittenRoot));
    orderedItems = collection.items;
    const state = readCitationState(content, codec);
    state.master = {
      style: settings.defaultCitationStyle,
      locale: settings.defaultLocale,
      documents: collection.documents,
      citations: collection.citations,
    };
    const indexed = writeCitationState(content, state, codec);
    cursor += indexed.length - content.length;
    content = indexed;
  }
  const bibliography = updateBibliography(content, sources, settings.bibliographyHeading,
    settings.includeBibliographyHeading, settings.bibliographyPosition, cursor,
    formatCslBibliography(orderedItems, style, settings.defaultLocale), orderedItems);
  return {
    content: bibliography.content, updated, skipped: skipped + (collection?.unresolvedDetails ?? 0),
    sourceCount: orderedItems.length, chapterCount: collection?.documents.length ?? 0, isMaster,
  };
}
