import { MarkdownView, type Plugin } from "obsidian";
import { EditorView } from "@codemirror/view";
import { findDocumentCitations } from "../document/citations";

/** Obsidian resolves # fragments as headings; our portable HTML IDs need a local bridge. */
export function registerCitationNavigation(plugin: Plugin): void {
  const documents = new WeakSet<Document>();
  const bind = (): void => {
    plugin.app.workspace.iterateAllLeaves(leaf => {
      if (!(leaf.view instanceof MarkdownView)) return;
      const doc = leaf.view.containerEl.ownerDocument;
      if (documents.has(doc)) return;
      documents.add(doc);
      const find = (event: MouseEvent): { view: MarkdownView; id: string; renderedLink: boolean } | undefined => {
        const target = event.target as Element | null;
        const link = target?.closest?.("a, .cm-link, .cm-url");
        const href = link?.getAttribute("data-href") ?? link?.getAttribute("href");
        if (!link) return;
        let view: MarkdownView | undefined;
        plugin.app.workspace.iterateAllLeaves(candidate => {
          if (candidate.view instanceof MarkdownView && candidate.view.containerEl.contains(link)) view = candidate.view;
        });
        if (!view) return;
        let id: string | undefined;
        if (href?.startsWith("#ref-")) id = href.slice(1);
        else if (link.matches(".cm-link, .cm-url")) {
          // CodeMirror source/live-preview links are spans, not HTML anchors.
          const cm = EditorView.findFromDOM(link as HTMLElement);
          if (!cm) return;
          const position = cm.posAtDOM(link);
          id = findDocumentCitations(cm.state.doc.toString())
            .find(citation => position >= citation.start && position < citation.end)?.anchor;
        }
        if (!id) return;
        if (!view.editor.getValue().includes(`<a id="${id}"></a>`)) return;
        return { view, id, renderedLink: link.matches("a") };
      };
      const navigate = (event: MouseEvent): void => {
        if (event.button !== 0) return;
        const match = find(event);
        if (!match) return;
        // Preserve normal cursor placement when editing Markdown source.
        if (!match.renderedLink && !event.metaKey && !event.ctrlKey) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const { view, id } = match;
        const offset = view.editor.getValue().indexOf(`<a id="${id}"></a>`);
        const position = view.editor.offsetToPos(offset);
        if (view.getMode() === "preview") {
          // Reading view may not have rendered distant bibliography sections yet.
          view.previewMode.applyScroll(position.line);
          const anchor = Array.from(view.containerEl.querySelectorAll<HTMLElement>("[id]"))
            .find(element => element.id === id);
          anchor?.scrollIntoView({ block: "center" });
        } else {
          view.editor.setCursor(position);
          view.editor.scrollIntoView({ from: position, to: position }, true);
          view.editor.focus();
        }
      };
      // Obsidian handles modifier-clicks on editor spans during mousedown.
      plugin.registerDomEvent(doc, "mousedown", event => {
        if (event.metaKey || event.ctrlKey) navigate(event);
      }, true);
      plugin.registerDomEvent(doc, "click", navigate, true);
      // Avoid Obsidian's misleading "heading not found" hover preview.
      plugin.registerDomEvent(doc, "mouseover", event => {
        if (find(event)) event.stopImmediatePropagation();
      }, true);
    });
  };
  plugin.app.workspace.onLayoutReady(bind);
  plugin.registerEvent(plugin.app.workspace.on("layout-change", bind));
}
