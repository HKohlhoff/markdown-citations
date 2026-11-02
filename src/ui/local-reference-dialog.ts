import { App, Component, DropdownComponent, MarkdownRenderer, Modal, Notice, Setting } from "obsidian";
import type { CSLType } from "@citation-js/core";
import {
  buildLocalReference,
  EMPTY_LOCAL_REFERENCE,
  LOCAL_REFERENCE_TYPES,
  type LocalReferenceInput,
} from "../bibliography/local-library";
import { formatCslBibliography, formatCslCitation } from "../csl/processor";
import { BUNDLED_CSL_LOCALES, cslLocaleTitle, isSupportedCslLocale } from "../csl/locales";
import { resolveCitationStyle } from "../csl/resolve-style";
import { BUNDLED_CITATION_STYLES, getBundledCitationStyle } from "../csl/styles";
import type { BibliographyItem } from "../model/bibliography";
import { VaultFileSuggestModal } from "./vault-path-modal";

const CHOOSE_CSL = "__choose_csl__";
const ADVANCED_FIELDS = [
  "editors", "containerTitle", "eventTitle", "genre", "volume", "issue", "edition", "pages",
  "version", "number", "publisher", "publisherPlace", "isbn", "doi", "url", "accessed",
] as const satisfies readonly (keyof LocalReferenceInput)[];
type AdvancedField = typeof ADVANCED_FIELDS[number];

const BASIC_FIELDS_BY_TYPE: Partial<Record<CSLType, readonly AdvancedField[]>> = {
  book: ["edition", "publisher", "isbn"],
  "article-journal": ["containerTitle", "volume", "issue", "pages", "doi"],
  chapter: ["containerTitle", "editors", "pages", "isbn"],
  "paper-conference": ["containerTitle", "eventTitle", "pages", "doi"],
  thesis: ["genre", "publisher"],
  report: ["publisher", "number"],
  webpage: ["url", "accessed"],
  dataset: ["version", "publisher", "doi"],
  software: ["version", "url", "doi"],
};

export class LocalReferenceDialog extends Modal {
  private readonly value: LocalReferenceInput;
  private readonly previewRenderer = new Component();
  private saving = false;
  private advancedOpen: boolean;
  private previewStyleId: string;
  private previewStyleXml: string;
  private previewEl?: HTMLElement;
  private advancedEl?: HTMLElement;
  private advancedButtonEl?: HTMLButtonElement;
  private basicFieldAnchor?: HTMLElement;
  private readonly fieldSettings = new Map<AdvancedField, Setting>();
  private readonly advancedAnchors = new Map<AdvancedField, HTMLElement>();
  private previewStyleSelect?: DropdownComponent;
  private previewTimer?: number;

  constructor(
    app: App,
    initial: LocalReferenceInput | undefined,
    private readonly originalCiteKey: string | undefined,
    configuredStyle: string,
    styleXml: string,
    private readonly locale: string,
    private readonly onSave: (value: LocalReferenceInput) => Promise<void>,
  ) {
    super(app);
    this.value = { ...EMPTY_LOCAL_REFERENCE, ...initial };
    if (!initial) this.value.language = locale;
    this.previewStyleId = configuredStyle;
    this.previewStyleXml = styleXml;
    this.advancedOpen = this.advancedValueCount() > 0;
  }

  onOpen(): void {
    this.setTitle(this.originalCiteKey ? "Edit local reference" : "Create local reference");
    this.modalEl.addClass("markdown-citations-local-reference-dialog");
    this.previewRenderer.load();
    this.contentEl.createEl("p", {
      text: "Add the essential details first. The citekey is generated automatically and remains stable when the reference is edited.",
      cls: "markdown-citations-dialog-source",
    });

    new Setting(this.contentEl)
      .setName("Reference type")
      .setClass("markdown-citations-reference-field")
      .addDropdown(dropdown => {
        for (const type of LOCAL_REFERENCE_TYPES) dropdown.addOption(type.id, type.label);
        if (!LOCAL_REFERENCE_TYPES.some(type => type.id === this.value.type)) {
          dropdown.addOption(this.value.type, `Existing type: ${this.value.type}`);
        }
        dropdown.setValue(this.value.type).onChange(value => {
          this.value.type = value as CSLType;
          this.updateTypeDependentFields();
          this.updateAdvancedButton();
          this.updatePreview();
        });
      });
    this.addText("Title", "Required.", "title", "Title of the work");
    this.addNames("Authors", "One name per line. Use Family, Given for people; write an organisation without a comma.", "authors");
    this.addText("Publication date", "YYYY, YYYY-MM, or YYYY-MM-DD.", "issued", "2026");
    this.basicFieldAnchor = this.contentEl.createDiv({ cls: "markdown-citations-local-reference-field-anchor" });
    this.addLanguage();

    this.contentEl.createDiv({
      text: this.originalCiteKey ? `Citekey: @${this.originalCiteKey}` : "The citekey will be created automatically when you save.",
      cls: "markdown-citations-local-reference-key",
    });

    new Setting(this.contentEl)
      .setClass("markdown-citations-local-reference-advanced-action")
      .addButton(button => {
        this.advancedButtonEl = button.buttonEl;
        this.updateAdvancedButton();
        button.onClick(() => {
          this.advancedOpen = !this.advancedOpen;
          this.updateAdvancedVisibility();
        });
      });

    this.advancedEl = this.contentEl.createDiv({ cls: "markdown-citations-local-reference-advanced" });
    new Setting(this.advancedEl).setName("Publication details").setHeading();
    this.addAdvancedNames("Editors", "One name per line, using the same format as authors.", "editors", this.advancedEl);
    this.addAdvancedText("Container title", "Journal, book, proceedings, or website containing this work.", "containerTitle", "Journal or book title", this.advancedEl);
    this.addAdvancedText("Conference / event", "Conference or other event related to this work.", "eventTitle", "Conference name", this.advancedEl);
    this.addAdvancedText("Type / genre", "Subtype of the reference, such as doctoral thesis.", "genre", "Doctoral thesis", this.advancedEl);

    const compact = this.advancedEl.createDiv({ cls: "markdown-citations-local-reference-grid" });
    this.addAdvancedText("Volume", "", "volume", "12", compact);
    this.addAdvancedText("Issue", "", "issue", "3", compact);
    this.addAdvancedText("Edition", "", "edition", "2", compact);
    this.addAdvancedText("Pages", "", "pages", "23–41", compact);

    this.addAdvancedText("Version", "Software or dataset version.", "version", "1.0.0", this.advancedEl);
    this.addAdvancedText("Number", "Report or series number.", "number", "TR-2026-01", this.advancedEl);
    this.addAdvancedText("Publisher", "Publisher, institution, university, or repository.", "publisher", "Publisher", this.advancedEl);
    this.addAdvancedText("Publisher place", "Optional place of publication.", "publisherPlace", "Berlin", this.advancedEl);
    new Setting(this.advancedEl).setName("Identifiers and access").setHeading();
    this.addAdvancedText("ISBN", "Book identifier.", "isbn", "978-…", this.advancedEl);
    this.addAdvancedText("DOI", "A DOI or doi.org URL; it is stored as a DOI.", "doi", "10.1234/example", this.advancedEl);
    this.addAdvancedText("URL", "Optional full web address.", "url", "https://example.org", this.advancedEl);
    this.addAdvancedText("Accessed", "Access date: YYYY, YYYY-MM, or YYYY-MM-DD.", "accessed", "2026-10-29", this.advancedEl);
    this.updateTypeDependentFields();
    this.updateAdvancedVisibility();

    const preview = this.contentEl.createDiv({ cls: "markdown-citations-citation-preview" });
    preview.createDiv({
      text: `Citation and bibliography preview · ${localeTitle(this.locale)}`,
      cls: "markdown-citations-citation-preview-label",
    });
    new Setting(preview)
      .setName("Preview style")
      .setDesc("This changes only the preview, not the plugin settings or reference data.")
      .setClass("markdown-citations-local-reference-preview-controls")
      .addDropdown(dropdown => {
        this.previewStyleSelect = dropdown;
        for (const style of BUNDLED_CITATION_STYLES) dropdown.addOption(style.id, style.title);
        if (!getBundledCitationStyle(this.previewStyleId)) dropdown.addOption(this.previewStyleId, `Custom: ${this.previewStyleId}`);
        dropdown.addOption(CHOOSE_CSL, "Choose CSL file from vault…");
        dropdown.setValue(this.previewStyleId).onChange(async value => {
          if (value === CHOOSE_CSL) {
            dropdown.setValue(this.previewStyleId);
            this.choosePreviewStyle();
            return;
          }
          await this.setPreviewStyle(value);
        });
      });
    this.previewEl = preview.createDiv();
    this.updatePreview();

    new Setting(this.contentEl)
      .setClass("markdown-citations-dialog-actions")
      .addButton(button => button.setButtonText("Cancel").onClick(() => this.close()))
      .addButton(button => button
        .setButtonText(this.originalCiteKey ? "Save reference" : "Create reference")
        .setCta()
        .onClick(async () => {
          if (this.saving) return;
          this.saving = true;
          button.setDisabled(true);
          try {
            buildLocalReference({ ...this.value, citeKey: this.originalCiteKey ?? "preview" });
            await this.onSave({ ...this.value });
            this.close();
          } catch (error) {
            new Notice(`Could not save local reference: ${errorMessage(error)}`, 9000);
          } finally {
            this.saving = false;
            button.setDisabled(false);
          }
        }));
  }

  onClose(): void {
    if (this.previewTimer !== undefined) window.clearTimeout(this.previewTimer);
    this.previewRenderer.unload();
    this.contentEl.empty();
  }

  private addText(
    name: string,
    description: string,
    field: Exclude<keyof LocalReferenceInput, "type" | "authors" | "editors">,
    placeholder: string,
    container: HTMLElement = this.contentEl,
  ): Setting {
    const setting = new Setting(container).setName(name).setClass("markdown-citations-reference-field");
    if (description) setting.setDesc(description);
    setting.addText(text => text
      .setPlaceholder(placeholder)
      .setValue(this.value[field])
      .onChange(value => this.change(field, value)));
    return setting;
  }

  private addAdvancedText(
    name: string,
    description: string,
    field: Exclude<AdvancedField, "editors">,
    placeholder: string,
    container: HTMLElement,
  ): Setting {
    const anchor = container.createDiv({ cls: "markdown-citations-local-reference-field-anchor" });
    const setting = this.addText(name, description, field, placeholder, container);
    this.advancedAnchors.set(field, anchor);
    this.fieldSettings.set(field, setting);
    return setting;
  }

  private addNames(
    name: string,
    description: string,
    field: "authors" | "editors",
    container: HTMLElement = this.contentEl,
  ): Setting {
    return new Setting(container)
      .setName(name)
      .setDesc(description)
      .setClass("markdown-citations-reference-field")
      .addTextArea(text => {
        text.setPlaceholder("Müller, Anna\nSchmidt, Boris")
          .setValue(this.value[field])
          .onChange(value => this.change(field, value));
        text.inputEl.rows = 3;
      });
  }

  private addAdvancedNames(
    name: string,
    description: string,
    field: "editors",
    container: HTMLElement,
  ): Setting {
    const anchor = container.createDiv({ cls: "markdown-citations-local-reference-field-anchor" });
    const setting = this.addNames(name, description, field, container);
    this.advancedAnchors.set(field, anchor);
    this.fieldSettings.set(field, setting);
    return setting;
  }

  private addLanguage(): void {
    new Setting(this.contentEl)
      .setName("Language")
      .setDesc("Language of the reference. New references use the global locale by default.")
      .setClass("markdown-citations-reference-field")
      .addDropdown(dropdown => {
        dropdown.addOption("", "Not specified");
        for (const locale of BUNDLED_CSL_LOCALES) dropdown.addOption(locale.id, locale.title);
        if (this.value.language && !isSupportedCslLocale(this.value.language)) {
          dropdown.addOption(this.value.language, `Existing value: ${this.value.language}`);
        }
        dropdown.setValue(this.value.language).onChange(value => this.change("language", value));
      });
  }

  private change(field: Exclude<keyof LocalReferenceInput, "type">, value: string): void {
    this.value[field] = value;
    this.updateAdvancedButton();
    this.updatePreview();
  }

  private updateAdvancedButton(): void {
    if (!this.advancedButtonEl) return;
    const count = this.advancedValueCount();
    this.advancedButtonEl.textContent = `${this.advancedOpen ? "Hide" : "Show"} advanced fields${count ? ` (${count})` : ""}`;
  }

  private advancedValueCount(): number {
    const basicFields = new Set(basicFieldsForType(this.value.type));
    return ADVANCED_FIELDS.filter(field => !basicFields.has(field) && String(this.value[field]).trim() !== "").length;
  }

  private updateTypeDependentFields(): void {
    if (!this.basicFieldAnchor || this.fieldSettings.size !== ADVANCED_FIELDS.length) return;
    for (const [field, setting] of this.fieldSettings) this.advancedAnchors.get(field)?.after(setting.settingEl);
    for (const field of basicFieldsForType(this.value.type)) {
      const setting = this.fieldSettings.get(field);
      if (setting) this.basicFieldAnchor.before(setting.settingEl);
    }
    this.updateTypeDependentLabels();
  }

  private updateTypeDependentLabels(): void {
    this.fieldSettings.get("containerTitle")?.setName(
      this.value.type === "article-journal" ? "Journal"
        : this.value.type === "chapter" ? "Book title"
          : this.value.type === "paper-conference" ? "Proceedings title"
            : "Container title",
    );
    this.fieldSettings.get("publisher")?.setName(
      this.value.type === "thesis" ? "University"
        : this.value.type === "report" ? "Institution"
          : this.value.type === "dataset" ? "Repository / publisher"
            : "Publisher",
    );
    this.fieldSettings.get("eventTitle")?.setName(this.value.type === "paper-conference" ? "Conference" : "Conference / event");
    this.fieldSettings.get("genre")?.setName(this.value.type === "thesis" ? "Thesis type" : "Type / genre");
    this.fieldSettings.get("number")?.setName(this.value.type === "report" ? "Report number" : "Number");
  }

  private updateAdvancedVisibility(): void {
    this.advancedEl?.toggleClass("is-hidden", !this.advancedOpen);
    this.updateAdvancedButton();
  }

  private choosePreviewStyle(): void {
    new VaultFileSuggestModal(this.app, "csl", file => {
      void this.setPreviewStyle(file.path);
    }).open();
  }

  private async setPreviewStyle(styleId: string): Promise<void> {
    try {
      this.previewStyleXml = await resolveCitationStyle(this.app.vault, styleId);
      this.previewStyleId = styleId;
      if (this.previewStyleSelect && ![...this.previewStyleSelect.selectEl.options].some(option => option.value === styleId)) {
        this.previewStyleSelect.addOption(styleId, `Custom: ${styleId}`);
      }
      this.previewStyleSelect?.setValue(styleId);
      this.updatePreview();
    } catch (error) {
      new Notice(`Could not load preview style: ${errorMessage(error)}`, 9000);
      this.previewStyleSelect?.setValue(this.previewStyleId);
    }
  }

  private updatePreview(): void {
    if (!this.previewEl) return;
    if (this.previewTimer !== undefined) window.clearTimeout(this.previewTimer);
    this.previewTimer = window.setTimeout(() => this.renderPreview(), 160);
  }

  private renderPreview(): void {
    this.previewTimer = undefined;
    if (!this.previewEl) return;
    try {
      const csl = buildLocalReference({
        ...this.value,
        citeKey: this.originalCiteKey ?? "preview",
        title: this.value.title || "Reference title",
      });
      const item: BibliographyItem = { citeKey: String(csl.id), sourcePath: "", csl };
      const citation = formatCslCitation([item], item, { form: "parenthetical" }, this.previewStyleXml, this.locale);
      const bibliography = formatCslBibliography([item], this.previewStyleXml, this.locale)[0]?.markdown ?? "";
      this.previewRenderer.unload();
      this.previewRenderer.load();
      this.previewEl.empty();
      this.previewEl.createDiv({ text: "Citation", cls: "markdown-citations-local-reference-preview-section-label" });
      const citationEl = this.previewEl.createDiv({ cls: "markdown-citations-local-reference-citation markdown-rendered" });
      this.previewEl.createDiv({ text: "Bibliography", cls: "markdown-citations-local-reference-preview-section-label" });
      const bibliographyEl = this.previewEl.createDiv({ cls: "markdown-citations-local-reference-bibliography markdown-rendered" });
      void MarkdownRenderer.render(this.app, citation, citationEl, "", this.previewRenderer)
        .catch(() => citationEl.setText(citation));
      void MarkdownRenderer.render(this.app, bibliography, bibliographyEl, "", this.previewRenderer)
        .catch(() => bibliographyEl.setText(bibliography));
    } catch (error) {
      this.previewEl.setText(errorMessage(error));
    }
  }
}

function basicFieldsForType(type: CSLType): readonly AdvancedField[] {
  return BASIC_FIELDS_BY_TYPE[type] ?? [];
}

function localeTitle(locale: string): string {
  return cslLocaleTitle(locale);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
