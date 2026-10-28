import { Notice, Plugin, type Editor } from "obsidian";
import { loadBibliographies } from "./bibliography/load";
import { renderMarkdownCitation } from "./citation/render";
import { updateBibliography } from "./document/bibliography";
import type { BibliographyItem } from "./model/bibliography";
import { normalizePluginData, type MarkdownCitationsData } from "./plugin-data";
import { normalizeSettings, type MarkdownCitationsSettings } from "./settings-data";
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
      name: "Update bibliography",
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
      editor.replaceSelection(renderMarkdownCitation(item));
    }).open();
  }

  private async requestBibliographyUpdate(editor: Editor): Promise<void> {
    const items = await this.loadSources();
    if (!items) return;
    const content = editor.getValue();
    const cursorOffset = editor.posToOffset(editor.getCursor());
    const update = updateBibliography(
      content,
      items,
      this.settings.bibliographyHeading,
      this.settings.bibliographyPosition,
      cursorOffset,
    );
    editor.setValue(update.content);
    new Notice(
      `Markdown Citations updated the bibliography with ${update.citedItems.length} source(s).`,
    );
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
