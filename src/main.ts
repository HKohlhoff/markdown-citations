import { Notice, Plugin, type Editor } from "obsidian";
import { loadBibliographies } from "./bibliography/load";
import { bibliographyAnchor, type CitationRenderOptions } from "./citation/render";
import { formatCslBibliography, formatCslCitation } from "./csl/processor";
import { resolveCitationStyle } from "./csl/resolve-style";
import { citedItemsInDocument, updateBibliography } from "./document/bibliography";
import type { BibliographyItem } from "./model/bibliography";
import { normalizePluginData, type MarkdownCitationsData } from "./plugin-data";
import { normalizeSettings, type MarkdownCitationsSettings } from "./settings-data";
import { CitationDialog } from "./ui/citation-dialog";
import { MarkdownCitationsSettingTab } from "./ui/settings-tab";
import { SourceSuggestModal } from "./ui/source-suggest-modal";

export default class MarkdownCitationsPlugin extends Plugin {
  settings: MarkdownCitationsSettings = normalizeSettings({});
  private data: MarkdownCitationsData = normalizePluginData({});

  async onload(): Promise<void> {
    this.data = normalizePluginData(await this.loadData());
    this.settings = this.data.settings;
    this.addSettingTab(new MarkdownCitationsSettingTab(this.app, this));
    this.addCommand({
      id: "insert-markdown-citation",
      name: "Insert citation",
      editorCallback: (editor) => {
        void this.requestCitation(editor);
      },
    });
    this.addCommand({
      id: "update-bibliography",
      name: "Insert / update bibliography",
      editorCallback: (editor) => {
        void this.requestBibliographyUpdate(editor);
      },
    });
    this.addCommand({
      id: "show-setup-status",
      name: "Show setup status",
      callback: () => {
        const count = this.settings.bibliographyPaths.length;
        new Notice(
          `Markdown Citations is loaded with ${count} configured bibliography file(s).`,
          6000,
        );
      },
    });
  }

  async saveSettings(): Promise<void> {
    this.settings = normalizeSettings(this.settings);
    this.data.settings = this.settings;
    await this.saveData(this.data);
  }

  private async requestCitation(editor: Editor): Promise<void> {
    const items = await this.loadSources();
    if (!items) return;
    new SourceSuggestModal(this.app, items, (item) => {
      void this.openCitationDialog(editor, items, item);
    }).open();
  }

  private async openCitationDialog(
    editor: Editor,
    items: readonly BibliographyItem[],
    item: BibliographyItem,
  ): Promise<void> {
    try {
      const style = await resolveCitationStyle(this.app.vault, this.settings.defaultCitationStyle);
      const orderedItems = citedItemsInDocument(editor.getValue(), items);
      if (!orderedItems.some((entry) => entry.citeKey === item.citeKey)) orderedItems.push(item);
      new CitationDialog(
        this.app,
        item,
        this.settings.defaultLocale,
        (options) => formatCslCitation(
          orderedItems,
          item,
          options,
          style,
          this.settings.defaultLocale,
        ),
        (options) => {
          this.insertFormattedCitation(editor, items, item, options, style);
        },
      ).open();
    } catch (error) {
      new Notice(`Markdown Citations could not apply the CSL style: ${errorMessage(error)}`, 9000);
    }
  }

  private async requestBibliographyUpdate(editor: Editor): Promise<void> {
    const items = await this.loadSources();
    if (!items) return;
    const content = editor.getValue();
    const cursorOffset = editor.posToOffset(editor.getCursor());
    const citedItems = citedItemsInDocument(content, items);
    let formattedEntries: ReturnType<typeof formatCslBibliography> | undefined;
    try {
      const style = await resolveCitationStyle(this.app.vault, this.settings.defaultCitationStyle);
      formattedEntries = formatCslBibliography(citedItems, style, this.settings.defaultLocale);
    } catch (error) {
      new Notice(`Markdown Citations could not apply the CSL style: ${errorMessage(error)}`, 9000);
      return;
    }
    const update = updateBibliography(
      content,
      items,
      this.settings.bibliographyHeading,
      this.settings.includeBibliographyHeading,
      this.settings.bibliographyPosition,
      cursorOffset,
      formattedEntries,
    );
    editor.setValue(update.content);
    new Notice(
      `Markdown Citations updated the bibliography with ${update.citedItems.length} source(s).`,
    );
  }

  private insertFormattedCitation(
    editor: Editor,
    items: readonly BibliographyItem[],
    item: BibliographyItem,
    options: CitationRenderOptions,
    style: string,
  ): void {
    try {
      const orderedItems = citedItemsInDocument(editor.getValue(), items);
      if (!orderedItems.some((entry) => entry.citeKey === item.citeKey)) orderedItems.push(item);
      const label = formatCslCitation(
        orderedItems,
        item,
        options,
        style,
        this.settings.defaultLocale,
      );
      editor.replaceSelection(`[${label}](#${bibliographyAnchor(item.citeKey)})`);
    } catch (error) {
      new Notice(`Markdown Citations could not format the citation: ${errorMessage(error)}`, 9000);
    }
  }

  private async loadSources(): Promise<BibliographyItem[] | undefined> {
    const paths = this.configuredBibliographyPaths();
    if (paths.length === 0) {
      new Notice("Add at least one BibTeX, BibLaTeX, or CSL-JSON file in the Markdown Citations settings.");
      return undefined;
    }

    const result = await loadBibliographies(this.app.vault, paths);
    if (result.errors.length > 0) {
      const first = result.errors[0];
      new Notice(
        `Markdown Citations found ${result.errors.length} bibliography problem(s). ${first?.path ?? ""}: ${first?.message ?? ""}`,
        9000,
      );
    }
    if (result.items.length === 0) {
      new Notice("No usable bibliography entries were found.", 7000);
      return undefined;
    }
    return result.items;
  }

  private configuredBibliographyPaths(): string[] {
    const paths = [...this.settings.bibliographyPaths];
    const localPath = this.settings.localLibraryPath;
    if (localPath && this.app.vault.getAbstractFileByPath(localPath)) paths.push(localPath);
    return [...new Set(paths)];
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
