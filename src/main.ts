import { Notice, Plugin, MarkdownView, TFile, parseYaml, stringifyYaml, type Editor } from "obsidian";
import { loadBibliographies } from "./bibliography/load";
import type { CitationRenderOptions } from "./citation/render";
import { formatCslCitation } from "./csl/processor";
import { resolveCitationStyle } from "./csl/resolve-style";
import { citedItemsInDocument } from "./document/bibliography";
import { insertCitation } from "./document/citations";
import { updateCitationDocument } from "./document/update-document";
import { readNoteFormatProperties, resolveNoteSettings } from "./document/note-settings";
import { createEmbeddingResolver } from "./vault/master-source";
import { DocumentationModal } from "./ui/documentation-modal";
import { LAST_UPDATE_MARKDOWN, README_MARKDOWN, prepareReadmeMarkdown } from "./ui/documentation-content";
import type { YamlCodec } from "./document/citation-frontmatter";
import type { BibliographyItem } from "./model/bibliography";
import { normalizePluginData, type MarkdownCitationsData } from "./plugin-data";
import { normalizeSettings, type MarkdownCitationsSettings } from "./settings-data";
import { CitationDialog } from "./ui/citation-dialog";
import { MarkdownCitationsSettingTab } from "./ui/settings-tab";
import { SourceSuggestModal } from "./ui/source-suggest-modal";
import { UpdateNoticeController } from "./update-notice";
import { registerCitationNavigation } from "./ui/citation-navigation";
import { NoteFormatDialog } from "./ui/note-format-dialog";
import { assertPublicationOwnership, buildPublication, publicationPath } from "./document/publication";
import { createPublicationLinkRebaser } from "./vault/publication-links";
import { deleteLocalReference, ensureLocalLibrary, readLocalLibrary, saveLocalReference } from "./vault/local-library";
import { generateLocalCiteKey, localReferenceInput, type LocalReferenceInput } from "./bibliography/local-library";
import { LocalReferenceDialog } from "./ui/local-reference-dialog";
import { DeleteLocalReferenceDialog, LocalLibraryDialog } from "./ui/local-library-dialog";

const yamlCodec: YamlCodec = { parse: parseYaml, stringify: stringifyYaml };

export default class MarkdownCitationsPlugin extends Plugin {
  settings: MarkdownCitationsSettings = normalizeSettings({});
  private data: MarkdownCitationsData = normalizePluginData({});
  private readonly documentationModals = new Set<DocumentationModal>();
  private updateNotice?: UpdateNoticeController;
  private disposed = false;
  private saveQueue: Promise<void> = Promise.resolve();

  async onload(): Promise<void> {
    this.disposed = false;
    this.register(() => {
      this.disposed = true;
      for (const modal of [...this.documentationModals]) modal.close();
    });
    this.data = normalizePluginData(await this.loadData());
    if (this.disposed) return;
    this.settings = this.data.settings;
    this.updateNotice = new UpdateNoticeController(
      this.manifest.version,
      () => this.data.lastReadUpdateVersion,
      () => new Promise<boolean>(resolve => {
        this.openDocumentation(`${this.manifest.name}: What's new`, LAST_UPDATE_MARKDOWN, () => resolve(!this.disposed));
      }),
      async version => {
        const previous = this.data.lastReadUpdateVersion;
        this.data.lastReadUpdateVersion = version;
        try { await this.savePluginData(); }
        catch (error) { this.data.lastReadUpdateVersion = previous; throw error; }
      },
      () => !this.disposed,
    );
    this.addSettingTab(new MarkdownCitationsSettingTab(this.app, this));
    registerCitationNavigation(this);
    this.addCommand({
      id: "manage-local-references",
      name: "Manage local references",
      callback: () => { void this.openLocalLibrary(); },
    });
    this.addCommand({
      id: "create-local-reference",
      name: "Create local reference",
      callback: () => { void this.openLocalReferenceEditor(); },
    });
    this.addCommand({
      id: "update-publication-note",
      name: "Create / update publication note",
      editorCallback: (editor, view) => { void this.requestPublication(editor, view.file); },
    });
    this.addCommand({
      id: "set-note-citation-format",
      name: "Set note citation style and language",
      editorCallback: (editor, view) => this.openNoteFormatDialog(editor, view.file),
    });
    this.addCommand({
      id: "insert-markdown-citation",
      name: "Insert citation",
      editorCallback: (editor) => {
        void this.requestCitation(editor);
      },
    });
    this.addCommand({
      id: "update-citations",
      name: "Update citations",
      editorCallback: (editor, view) => {
        void this.requestCitationUpdate(editor, view.file);
      },
    });
    this.addCommand({
      id: "update-bibliography",
      name: "Insert / update bibliography",
      editorCallback: (editor, view) => {
        void this.requestBibliographyUpdate(editor, view.file);
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
    this.app.workspace.onLayoutReady(() => {
      if (!this.disposed) this.showUpdateNotice();
    });
  }

  async saveSettings(): Promise<void> {
    this.settings = normalizeSettings(this.settings);
    this.data.settings = this.settings;
    await this.savePluginData();
  }

  private savePluginData(): Promise<void> {
    const save = this.saveQueue.then(() => this.saveData({
      ...this.data,
      settings: { ...this.settings, bibliographyPaths: [...this.settings.bibliographyPaths] },
    }));
    this.saveQueue = save.catch(() => undefined);
    return save;
  }

  showReadme(): void {
    if (this.disposed) return;
    this.openDocumentation(`${this.manifest.name}: README`, prepareReadmeMarkdown(README_MARKDOWN));
  }

  showLastUpdate(): void {
    this.showUpdateNotice(true);
  }

  async openLocalLibrary(): Promise<void> {
    try {
      const path = await this.prepareLocalLibrary();
      const items = await readLocalLibrary(this.app.vault, path);
      const modal = new LocalLibraryDialog(
        this.app,
        path,
        items,
        () => { void this.openLocalReferenceEditor(); },
        item => { void this.openLocalReferenceEditor(item); },
        item => this.confirmDeleteLocalReference(item),
      );
      this.register(() => modal.close());
      modal.open();
    } catch (error) {
      new Notice(`Could not open local reference library: ${errorMessage(error)}`, 9000);
    }
  }

  async openLocalReferenceEditor(item?: BibliographyItem): Promise<void> {
    try {
      const path = await this.prepareLocalLibrary();
      if (item && item.sourcePath !== path) throw new Error("Only references from the local library can be edited.");
      const style = await resolveCitationStyle(this.app.vault, this.settings.defaultCitationStyle);
      const modal = new LocalReferenceDialog(
        this.app,
        item ? localReferenceInput(item.csl) : undefined,
        item?.citeKey,
        this.settings.defaultCitationStyle,
        style,
        this.settings.defaultLocale,
        async value => this.persistLocalReference(path, value, item?.citeKey),
      );
      this.register(() => modal.close());
      modal.open();
    } catch (error) {
      new Notice(`Could not open local reference editor: ${errorMessage(error)}`, 9000);
    }
  }

  private showUpdateNotice(force = false): void {
    void this.updateNotice?.show(force).catch((error: unknown) => {
      console.error("[markdown-citations] Could not save update acknowledgement", error);
      new Notice("The update description could not be marked as read and may appear again after restart.", 7000);
    });
  }

  private openDocumentation(title: string, markdown: string, onClosed: () => void = () => undefined): void {
    const modal = new DocumentationModal(this.app, title, markdown, () => {
      this.documentationModals.delete(modal);
      onClosed();
    });
    this.documentationModals.add(modal);
    modal.open();
  }

  private async prepareLocalLibrary(): Promise<string> {
    if (!this.settings.localLibraryPath) {
      this.settings.localLibraryPath = "MarkdownCitations.json";
      await this.saveSettings();
    }
    return ensureLocalLibrary(this.app.vault, this.settings.localLibraryPath);
  }

  private async persistLocalReference(
    path: string,
    value: LocalReferenceInput,
    originalCiteKey?: string,
  ): Promise<void> {
    const allSources = await loadBibliographies(this.app.vault, this.configuredBibliographyPaths(this.settings));
    const savedValue = originalCiteKey
      ? { ...value, citeKey: originalCiteKey }
      : { ...value, citeKey: generateLocalCiteKey(value, allSources.items.map(entry => entry.citeKey)) };
    await saveLocalReference(this.app.vault, path, savedValue, originalCiteKey);
    new Notice(`${originalCiteKey ? "Local reference saved" : "Local reference created"}: @${savedValue.citeKey}`);
    void this.openLocalLibrary();
  }

  private confirmDeleteLocalReference(item: BibliographyItem): void {
    const modal = new DeleteLocalReferenceDialog(this.app, item, async () => {
      try {
        await deleteLocalReference(this.app.vault, item.sourcePath, item.citeKey);
        new Notice(`Local reference deleted: @${item.citeKey}`);
        void this.openLocalLibrary();
      } catch (error) {
        new Notice(`Could not delete local reference: ${errorMessage(error)}`, 9000);
      }
    });
    this.register(() => modal.close());
    modal.open();
  }

  private openNoteFormatDialog(editor: Editor, file?: TFile | null): void {
    if (!this.settings.allowFrontmatterOverrides) {
      new Notice("Local citation settings are disabled. Enable Allow frontmatter overrides in Markdown Citations settings first.", 7000);
      return;
    }
    if (!file) {
      new Notice("Save the note before setting its citation style and language.");
      return;
    }
    try {
      const properties = readNoteFormatProperties(editor.getValue(), yamlCodec);
      const style = typeof properties.style === "string" ? properties.style.trim() : "";
      const locale = ["de-DE", "en-US", "en-GB"].includes(String(properties.locale)) ? String(properties.locale) : "";
      const modal = new NoteFormatDialog(this.app, { style, locale }, {
        style: this.settings.defaultCitationStyle, locale: this.settings.defaultLocale,
      }, async (selection, update) => {
        if (!this.settings.allowFrontmatterOverrides) throw new Error("Allow frontmatter overrides is switched off.");
        if (selection.style) await resolveCitationStyle(this.app.vault, selection.style);
        await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
          const existing = frontmatter["markdown-citations"];
          if (existing !== undefined && (existing === null || typeof existing !== "object" || Array.isArray(existing))) throw new Error("markdown-citations must be a YAML mapping.");
          const group = (existing ?? {}) as Record<string, unknown>;
          if (selection.style) group.style = selection.style;
          else delete group.style;
          if (selection.locale) group.locale = selection.locale;
          else delete group.locale;
          if (Object.keys(group).length) frontmatter["markdown-citations"] = group;
          else delete frontmatter["markdown-citations"];
          delete frontmatter["mc-style"];
          delete frontmatter["mc-locale"];
        });
        if (update) {
          try {
            await this.updateSavedNote(file);
          } catch (error) {
            throw new Error(`Settings were saved, but citations could not be updated: ${errorMessage(error)}`);
          }
        } else {
          new Notice("Note citation settings saved. Run Update citations to apply them to existing citations and the bibliography.", 7000);
        }
      });
      this.register(() => modal.close());
      modal.open();
    } catch (error) {
      new Notice(`Could not open note citation settings: ${errorMessage(error)}`, 9000);
    }
  }

  private async updateSavedNote(file: TFile): Promise<void> {
    const content = await this.app.vault.read(file);
    const settings = resolveNoteSettings(this.settings, content, yamlCodec);
    const sources = await this.loadSources(settings);
    if (!sources) throw new Error("No usable bibliography sources are configured.");
    const style = await resolveCitationStyle(this.app.vault, settings.defaultCitationStyle);
    const result = await updateCitationDocument(
      { path: file.path, content }, sources, settings, style, yamlCodec,
      root => createEmbeddingResolver(this.app, root), content.length, true,
    );
    await this.app.vault.process(file, current => {
      if (current !== content) throw new Error("The note changed during the update. Please run Update citations again.");
      return result.content;
    });
    new Notice(`Note citation settings saved; ${result.updated} local citation(s) and the bibliography with ${result.sourceCount} source(s) updated.${result.skipped ? ` ${result.skipped} citation detail(s) could not be recovered.` : ""}`);
  }

  private async requestPublication(editor: Editor, file?: TFile | null): Promise<void> {
    try {
      if (!file) throw new Error("Save the master before creating its publication version.");
      const root = { path: file.path, content: editor.getValue() };
      const settings = resolveNoteSettings(this.settings, root.content, yamlCodec);
      const items = await this.loadSources(settings);
      if (!items) return;
      const style = await resolveCitationStyle(this.app.vault, settings.defaultCitationStyle);
      const targetPath = publicationPath(file.path);
      const existing = this.app.vault.getAbstractFileByPath(targetPath);
      if (existing && !(existing instanceof TFile)) throw new Error(`The publication path is occupied: ${targetPath}`);
      const previous = existing instanceof TFile ? await this.app.vault.read(existing) : undefined;
      if (previous !== undefined) assertPublicationOwnership(previous, file.path, yamlCodec);
      const openView = (path: string): MarkdownView | undefined => this.app.workspace.getLeavesOfType("markdown")
        .map(leaf => leaf.view).find((view): view is MarkdownView => view instanceof MarkdownView && view.file?.path === path);
      const openOutput = openView(targetPath);
      if (openOutput && previous !== undefined && openOutput.editor.getValue() !== previous) throw new Error("Save or close the publication note before regenerating it; it has unsaved edits.");
      const snapshots = new Map<string, string>([[root.path, root.content]]);
      const resolve = createEmbeddingResolver(this.app, root);
      const result = await buildPublication(root, items, settings, style, yamlCodec, async (target, sourcePath) => {
        const resolved = await resolve(target, sourcePath);
        if (resolved) snapshots.set(resolved.note.path, resolved.note.content);
        return resolved;
      }, createPublicationLinkRebaser(this.app, root.path, targetPath));
      for (const [path, snapshot] of snapshots) {
        const input = this.app.vault.getAbstractFileByPath(path);
        if (!(input instanceof TFile)) throw new Error(`Source note disappeared: ${path}`);
        const current = path === root.path ? editor.getValue() : openView(path)?.editor.getValue() ?? await this.app.vault.read(input);
        if (current !== snapshot) throw new Error(`Source note changed during publication: ${path}. Run the command again.`);
      }
      let output: TFile;
      if (existing instanceof TFile) {
        await this.app.vault.process(existing, current => {
          if (current !== previous || (openOutput && openOutput.editor.getValue() !== previous)) throw new Error("The publication note changed during generation. Please retry.");
          return result.content;
        });
        output = existing;
      } else output = await this.app.vault.create(targetPath, result.content);
      new Notice(`Publication note created: ${output.name}. ${result.citationCount} citation(s), ${result.sourceCount} source(s). Original notes are unchanged.`, 7000);
      if (openOutput) await this.app.workspace.revealLeaf(openOutput.leaf);
      else await this.app.workspace.getLeaf("tab").openFile(output);
    } catch (error) {
      new Notice(`Could not create publication note: ${errorMessage(error)}`, 9000);
    }
  }

  private async requestCitation(editor: Editor): Promise<void> {
    try {
      const settings = resolveNoteSettings(this.settings, editor.getValue(), yamlCodec);
      const items = await this.loadSources(settings);
      if (!items) return;
      new SourceSuggestModal(this.app, items, (item) => {
        void this.openCitationDialog(editor, items, item, settings);
      }).open();
    } catch (error) {
      new Notice(`Markdown Citations could not use this note's settings: ${errorMessage(error)}`, 9000);
    }
  }

  private async openCitationDialog(
    editor: Editor,
    items: readonly BibliographyItem[],
    item: BibliographyItem,
    settings: MarkdownCitationsSettings,
  ): Promise<void> {
    try {
      const style = await resolveCitationStyle(this.app.vault, settings.defaultCitationStyle);
      const orderedItems = citedItemsInDocument(editor.getValue(), items);
      if (!orderedItems.some((entry) => entry.citeKey === item.citeKey)) orderedItems.push(item);
      new CitationDialog(
        this.app,
        item,
        settings.defaultLocale,
        (options) => formatCslCitation(
          orderedItems,
          item,
          options,
          style,
          settings.defaultLocale,
        ),
        (options) => {
          this.insertFormattedCitation(editor, items, item, options, style, settings);
        },
      ).open();
    } catch (error) {
      new Notice(`Markdown Citations could not apply the CSL style: ${errorMessage(error)}`, 9000);
    }
  }

  private async requestBibliographyUpdate(editor: Editor, file?: TFile | null): Promise<void> {
    await this.requestDocumentUpdate(editor, false, file);
  }

  private async requestCitationUpdate(editor: Editor, file?: TFile | null): Promise<void> {
    await this.requestDocumentUpdate(editor, true, file);
  }

  private async requestDocumentUpdate(editor: Editor, reformat: boolean, file?: TFile | null): Promise<void> {
    const content = editor.getValue();
    const sourceFile = file ?? this.app.workspace.getActiveFile();
    try {
      if (!sourceFile) throw new Error("Save the note before updating citations.");
      const settings = resolveNoteSettings(this.settings, content, yamlCodec);
      const items = await this.loadSources(settings);
      if (!items) return;
      const style = await resolveCitationStyle(this.app.vault, settings.defaultCitationStyle);
      const result = await updateCitationDocument(
        { path: sourceFile.path, content }, items, settings, style, yamlCodec,
        root => createEmbeddingResolver(this.app, root), editor.posToOffset(editor.getCursor()), reformat,
      );
      if (editor.getValue() !== content) throw new Error("The note changed during the update. Please run the command again.");
      editor.setValue(result.content);
      const skipped = result.skipped > 0 ? ` ${result.skipped} citation detail(s) could not be recovered.` : "";
      const master = result.isMaster ? ` Master index includes ${result.chapterCount} embedded note(s); chapter texts are unchanged.` : "";
      new Notice(`Markdown Citations updated the bibliography with ${result.sourceCount} source(s)${reformat ? ` and ${result.updated} local citation(s)` : ""}.${master}${skipped}`, result.isMaster ? 9000 : undefined);
    } catch (error) {
      new Notice(`Markdown Citations could not update citations: ${errorMessage(error)}`, 9000);
    }
  }

  private insertFormattedCitation(
    editor: Editor,
    items: readonly BibliographyItem[],
    item: BibliographyItem,
    options: CitationRenderOptions,
    style: string,
    settings: MarkdownCitationsSettings,
  ): void {
    try {
      const orderedItems = citedItemsInDocument(editor.getValue(), items);
      if (!orderedItems.some((entry) => entry.citeKey === item.citeKey)) orderedItems.push(item);
      const label = formatCslCitation(
        orderedItems,
        item,
        options,
        style,
        settings.defaultLocale,
      );
      const content = editor.getValue();
      const from = editor.posToOffset(editor.getCursor("from"));
      const to = editor.posToOffset(editor.getCursor("to"));
      const updated = insertCitation(content, from, to, label, item.citeKey, options, yamlCodec);
      editor.setValue(updated);
      editor.setCursor(editor.offsetToPos(from + updated.length - content.length + (to - from)));
    } catch (error) {
      new Notice(`Markdown Citations could not format the citation: ${errorMessage(error)}`, 9000);
    }
  }

  private async loadSources(settings: MarkdownCitationsSettings): Promise<BibliographyItem[] | undefined> {
    const paths = this.configuredBibliographyPaths(settings);
    if (paths.length === 0) {
      new Notice("Select at least one bibliography file: .bib or .json (CSL-JSON).");
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

  private configuredBibliographyPaths(settings: MarkdownCitationsSettings): string[] {
    const paths = [...settings.bibliographyPaths];
    const localPath = settings.localLibraryPath;
    if (localPath && this.app.vault.getAbstractFileByPath(localPath)) paths.push(localPath);
    return [...new Set(paths)];
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
