import { App, MarkdownView, TFile, parseLinktext, resolveSubpath } from "obsidian";
import type { ResolveEmbedding, SourceNote } from "../document/master";

/** Resolve like Obsidian and use Vault APIs; no directory-wide discovery or writes. */
export function createEmbeddingResolver(app: App, root: SourceNote): ResolveEmbedding {
  const notes = new Map<string, SourceNote>([[root.path, root]]);
  return async (target, sourcePath) => {
    const { path, subpath } = parseLinktext(target);
    const file = path
      ? app.metadataCache.getFirstLinkpathDest(path, sourcePath)
      : app.vault.getAbstractFileByPath(sourcePath);
    if (!(file instanceof TFile)) {
      // Ignore missing images/media, but a missing note must never silently prune a master.
      if (/\.(?:png|jpe?g|gif|svg|webp|avif|pdf|mp[34]|wav|ogg|webm|canvas)$/iu.test(path)) return null;
      throw new Error(`Embedded note not found: ${target} (from ${sourcePath}).`);
    }
    if (file.extension.toLowerCase() !== "md") return null;
    let note = notes.get(file.path);
    if (!note) {
      const open = app.workspace.getLeavesOfType("markdown")
        .map(leaf => leaf.view)
        .find(view => view instanceof MarkdownView && view.file?.path === file.path);
      const content = open instanceof MarkdownView ? open.editor.getValue() : await app.vault.cachedRead(file);
      note = { path: file.path, content };
      notes.set(file.path, note);
    }
    if (!subpath) return { note };
    const cache = app.metadataCache.getFileCache(file);
    const selected = cache ? resolveSubpath(cache, subpath) : null;
    if (!selected) throw new Error(`Embedded heading or block not found: ${target} (from ${sourcePath}).`);
    if (note.content !== await app.vault.cachedRead(file)) throw new Error(`Save ${file.path} before resolving a heading or block embedding.`);
    const start = selected.start.offset;
    const end = selected.end?.offset ?? note.content.length;
    if (start < 0 || end < start || end > note.content.length) throw new Error(`Stale embedding metadata for ${target}. Save the note and retry.`);
    return { note, range: { start, end } };
  };
}
