import { App, DropdownComponent, Modal, Notice, Setting } from "obsidian";
import type { CSLType } from "@citation-js/core";
import {
  buildLocalReference,
  EMPTY_LOCAL_REFERENCE,
  LOCAL_REFERENCE_TYPES,
  type LocalReferenceInput,
} from "../bibliography/local-library";
import { formatCslBibliography, formatCslCitation } from "../csl/processor";
import { resolveCitationStyle } from "../csl/resolve-style";
import { BUNDLED_CITATION_STYLES, getBundledCitationStyle } from "../csl/styles";
import type { BibliographyItem } from "../model/bibliography";
import { VaultFileSuggestModal } from "./vault-path-modal";

const CHOOSE_CSL = "__choose_csl__";
const ADVANCED_FIELDS: readonly (keyof LocalReferenceInput)[] = [
  "editors", "containerTitle", "volume", "issue", "edition", "pages", "publisher",
  "publisherPlace", "isbn", "doi", "url", "accessed",
];

export class LocalReferenceDialog extends Modal {
  private readonly value: LocalReferenceInput;
  private saving = false;
  private advancedOpen: boolean;
  private previewStyleOpen = false;
  private previewStyleId: string;
  private previewStyleXml: string;
  private previewEl?: HTMLElement;
  private previewLabelEl?: HTMLElement;
  private advancedEl?: HTMLElement;
  private advancedButtonEl?: HTMLButtonElement;
  private previewStyleControlsEl?: HTMLElement;
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
    this.previewStyleId = configuredStyle;
    this.previewStyleXml = styleXml;
    this.advancedOpen = ADVANCED_FIELDS.some(field => String(this.value[field]).trim() !== "");
  }

  onOpen(): void {
    this.setTitle(this.originalCiteKey ? "Edit local reference" : "Create local reference");
    this.modalEl.addClass("markdown-citations-local-reference-dialog");
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
          this.updatePreview();
        });
      });
    this.addText("Title", "Required.", "title", "Title of the work");
    this.addNames("Authors", "One name per line. Use Family, Given for people; write an organisation without a comma.", "authors");
    this.addText("Publication date", "YYYY, YYYY-MM, or YYYY-MM-DD.", "issued", "2026");
    this.addText("Language", "Optional BCP 47 language tag.", "language", "de-DE");

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
    this.addNames("Editors", "One name per line, using the same format as authors.", "editors", this.advancedEl);
    this.addText("Container title", "Journal, book, proceedings, or website containing this work.", "containerTitle", "Journal or book title", this.advancedEl);

    const compact = this.advancedEl.createDiv({ cls: "markdown-citations-local-reference-grid" });
    this.addText("Volume", "", "volume", "12", compact);
    this.addText("Issue", "", "issue", "3", compact);
    this.addText("Edition", "", "edition", "2", compact);
    this.addText("Pages", "", "pages", "23–41", compact);

    this.addText("Publisher", "Optional publisher or institution.", "publisher", "Publisher", this.advancedEl);
    this.addText("Publisher place", "Optional place of publication.", "publisherPlace", "Berlin", this.advancedEl);
    new Setting(this.advancedEl).setName("Identifiers and access").setHeading();
    this.addText("ISBN", "Optional ISBN for books and chapters.", "isbn", "978-…", this.advancedEl);
    this.addText("DOI", "A DOI or doi.org URL; it is stored as a DOI.", "doi", "10.1234/example", this.advancedEl);
    this.addText("URL", "Optional full web address.", "url", "https://example.org", this.advancedEl);
    this.addText("Accessed", "Optional access date: YYYY, YYYY-MM, or YYYY-MM-DD.", "accessed", "2026-10-29", this.advancedEl);
    this.updateAdvancedVisibility();

    const preview = this.contentEl.createDiv({ cls: "markdown-citations-citation-preview" });
    const previewHeader = preview.createDiv({ cls: "markdown-citations-local-reference-preview-header" });
    this.previewLabelEl = previewHeader.createDiv({ cls: "markdown-citations-citation-preview-label" });
    const styleButton = previewHeader.createEl("button", {
      text: "Change preview style",
      cls: "mod-ghost markdown-citations-local-reference-preview-style-button",
    });
    styleButton.addEventListener("click", () => {
      this.previewStyleOpen = !this.previewStyleOpen;
      this.updatePreviewStyleVisibility();
    });
    this.previewStyleControlsEl = preview.createDiv({ cls: "markdown-citations-local-reference-preview-controls" });
    new Setting(this.previewStyleControlsEl)
      .setName("Preview style")
      .setDesc("This changes only the preview, not the plugin settings or reference data.")
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
    this.updatePreviewStyleVisibility();
    this.previewEl = preview.createDiv();
    this.updatePreviewLabel();
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
    this.contentEl.empty();
  }

  private addText(
    name: string,
    description: string,
    field: Exclude<keyof LocalReferenceInput, "type" | "authors" | "editors">,
    placeholder: string,
    container: HTMLElement = this.contentEl,
  ): void {
    const setting = new Setting(container).setName(name).setClass("markdown-citations-reference-field");
    if (description) setting.setDesc(description);
    setting.addText(text => text
      .setPlaceholder(placeholder)
      .setValue(this.value[field])
      .onChange(value => this.change(field, value)));
  }

  private addNames(
    name: string,
    description: string,
    field: "authors" | "editors",
    container: HTMLElement = this.contentEl,
  ): void {
    new Setting(container)
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

  private change(field: Exclude<keyof LocalReferenceInput, "type">, value: string): void {
    this.value[field] = value;
    this.updateAdvancedButton();
    this.updatePreview();
  }

  private updateAdvancedButton(): void {
    if (!this.advancedButtonEl) return;
    const count = ADVANCED_FIELDS.filter(field => String(this.value[field]).trim() !== "").length;
    this.advancedButtonEl.textContent = `${this.advancedOpen ? "Hide" : "Show"} advanced fields${count ? ` (${count})` : ""}`;
  }

  private updateAdvancedVisibility(): void {
    this.advancedEl?.toggleClass("is-hidden", !this.advancedOpen);
    this.updateAdvancedButton();
  }

  private updatePreviewStyleVisibility(): void {
    this.previewStyleControlsEl?.toggleClass("is-hidden", !this.previewStyleOpen);
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
      this.updatePreviewLabel();
      this.updatePreview();
    } catch (error) {
      new Notice(`Could not load preview style: ${errorMessage(error)}`, 9000);
      this.previewStyleSelect?.setValue(this.previewStyleId);
    }
  }

  private updatePreviewLabel(): void {
    this.previewLabelEl?.setText(`Preview · ${styleTitle(this.previewStyleId)} · ${localeTitle(this.locale)}`);
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
      this.previewEl.empty();
      this.previewEl.createDiv({ text: citation, cls: "markdown-citations-local-reference-citation" });
      this.previewEl.createEl("hr");
      this.previewEl.createDiv({ text: bibliography });
    } catch (error) {
      this.previewEl.setText(errorMessage(error));
    }
  }
}

function styleTitle(styleId: string): string {
  return getBundledCitationStyle(styleId)?.title ?? `Custom: ${styleId}`;
}

function localeTitle(locale: string): string {
  if (locale === "de-DE") return "Deutsch (Deutschland)";
  if (locale === "en-US") return "English (United States)";
  if (locale === "en-GB") return "English (United Kingdom)";
  return locale;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
