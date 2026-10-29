import { App, Modal, Notice, Setting } from "obsidian";
import type { CSLType } from "@citation-js/core";
import {
  buildLocalReference,
  EMPTY_LOCAL_REFERENCE,
  LOCAL_REFERENCE_TYPES,
  type LocalReferenceInput,
} from "../bibliography/local-library";
import { formatCslBibliography, formatCslCitation } from "../csl/processor";
import type { BibliographyItem } from "../model/bibliography";

export class LocalReferenceDialog extends Modal {
  private readonly value: LocalReferenceInput;
  private saving = false;
  private previewEl?: HTMLElement;
  private previewTimer?: number;

  constructor(
    app: App,
    initial: LocalReferenceInput | undefined,
    private readonly originalCiteKey: string | undefined,
    private readonly style: string,
    private readonly locale: string,
    private readonly onSave: (value: LocalReferenceInput) => Promise<void>,
  ) {
    super(app);
    this.value = { ...EMPTY_LOCAL_REFERENCE, ...initial };
  }

  onOpen(): void {
    this.setTitle(this.originalCiteKey ? "Edit local reference" : "Create local reference");
    this.modalEl.addClass("markdown-citations-local-reference-dialog");
    this.contentEl.createEl("p", {
      text: "Build a CSL-JSON reference from bibliographic attributes. The previews use the current citation style and language.",
      cls: "markdown-citations-dialog-source",
    });

    new Setting(this.contentEl).setName("Reference type").addDropdown(dropdown => {
      for (const type of LOCAL_REFERENCE_TYPES) dropdown.addOption(type.id, type.label);
      if (!LOCAL_REFERENCE_TYPES.some(type => type.id === this.value.type)) {
        dropdown.addOption(this.value.type, `Existing type: ${this.value.type}`);
      }
      dropdown.setValue(this.value.type).onChange(value => {
        this.value.type = value as CSLType;
        this.updatePreview();
      });
    });
    const citeKey = new Setting(this.contentEl)
      .setName("Citekey")
      .setDesc(this.originalCiteKey
        ? "The citekey stays fixed so existing citation links remain valid."
        : "Required stable identifier without spaces, for example mueller2026.");
    citeKey.addText(text => text
      .setPlaceholder("mueller2026")
      .setValue(this.value.citeKey)
      .setDisabled(this.originalCiteKey !== undefined)
      .onChange(value => this.change("citeKey", value)));

    this.addText("Title", "Required.", "title", "Title of the work");
    this.addNames("Authors", "One name per line. Use Family, Given for people; write an organisation without a comma.", "authors");
    this.addNames("Editors", "Optional. One name per line, using the same format as authors.", "editors");
    this.addText("Publication date", "YYYY, YYYY-MM, or YYYY-MM-DD.", "issued", "2026");
    this.addText("Container title", "Journal, book, proceedings, or website containing this work.", "containerTitle", "Journal or book title");
    this.addText("Publisher", "Optional publisher or institution.", "publisher", "Publisher");
    this.addText("Publisher place", "Optional place of publication.", "publisherPlace", "Berlin");

    const compact = this.contentEl.createDiv({ cls: "markdown-citations-local-reference-grid" });
    this.addText("Volume", "", "volume", "12", compact);
    this.addText("Issue", "", "issue", "3", compact);
    this.addText("Pages", "Page or page range.", "pages", "23–41", compact);
    this.addText("Edition", "", "edition", "2", compact);

    this.addText("DOI", "A DOI or doi.org URL; it is stored as a DOI.", "doi", "10.1234/example");
    this.addText("URL", "Optional full web address.", "url", "https://example.org");
    this.addText("Accessed", "Optional access date: YYYY, YYYY-MM, or YYYY-MM-DD.", "accessed", "2026-10-29");
    this.addText("Language", "Optional BCP 47 language tag.", "language", "de-DE");
    this.addText("ISBN", "Optional ISBN for books and chapters.", "isbn", "978-…");

    const preview = this.contentEl.createDiv({ cls: "markdown-citations-citation-preview" });
    preview.createDiv({ text: "Citation and bibliography preview", cls: "markdown-citations-citation-preview-label" });
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
            buildLocalReference(this.value);
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
    const setting = new Setting(container).setName(name);
    if (description) setting.setDesc(description);
    setting.addText(text => text
      .setPlaceholder(placeholder)
      .setValue(this.value[field])
      .onChange(value => this.change(field, value)));
  }

  private addNames(name: string, description: string, field: "authors" | "editors"): void {
    new Setting(this.contentEl)
      .setName(name)
      .setDesc(description)
      .addTextArea(text => {
        text.setPlaceholder("Müller, Anna\nSchmidt, Boris")
          .setValue(this.value[field])
          .onChange(value => this.change(field, value));
        text.inputEl.rows = 3;
      });
  }

  private change(field: Exclude<keyof LocalReferenceInput, "type">, value: string): void {
    this.value[field] = value;
    this.updatePreview();
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
        citeKey: this.value.citeKey || "preview",
        title: this.value.title || "Reference title",
      });
      const item: BibliographyItem = { citeKey: String(csl.id), sourcePath: "", csl };
      const citation = formatCslCitation([item], item, { form: "parenthetical" }, this.style, this.locale);
      const bibliography = formatCslBibliography([item], this.style, this.locale)[0]?.markdown ?? "";
      this.previewEl.empty();
      this.previewEl.createDiv({ text: citation, cls: "markdown-citations-local-reference-citation" });
      this.previewEl.createEl("hr");
      this.previewEl.createDiv({ text: bibliography });
    } catch (error) {
      this.previewEl.setText(errorMessage(error));
    }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
