import { App, Modal, Setting } from "obsidian";
import {
  type CitationForm,
  type CitationLocatorType,
  type CitationRenderOptions,
} from "../citation/render";
import type { BibliographyItem } from "../model/bibliography";

export class CitationDialog extends Modal {
  private form: CitationForm = "parenthetical";
  private locatorType: CitationLocatorType = "page";
  private locator = "";
  private prefix = "";
  private suffix = "";
  private previewEl?: HTMLElement;

  constructor(
    app: App,
    private readonly item: BibliographyItem,
    private readonly locale: string,
    private readonly renderPreview: (options: CitationRenderOptions) => string,
    private readonly onInsert: (options: CitationRenderOptions) => void,
  ) {
    super(app);
  }

  onOpen(): void {
    this.setTitle("Insert citation");
    this.modalEl.addClass("markdown-citations-citation-dialog");
    this.contentEl.createEl("p", {
      text: this.item.csl.title?.trim() || this.item.citeKey,
      cls: "markdown-citations-dialog-source",
    });

    new Setting(this.contentEl)
      .setName("Citation form")
      .setDesc("Choose a parenthetical citation or integrate the author into the sentence.")
      .addDropdown((dropdown) => dropdown
        .addOption("parenthetical", "Parenthetical: (Author, year)")
        .addOption("narrative", "Narrative: Author (year)")
        .setValue(this.form)
        .onChange((value) => {
          this.form = value === "narrative" ? "narrative" : "parenthetical";
          this.updatePreview();
        }));

    new Setting(this.contentEl)
      .setName("Locator type")
      .setDesc("Select the kind of location to include when a locator is entered.")
      .addDropdown((dropdown) => dropdown
        .addOption("page", "Page")
        .addOption("pages", "Page range")
        .addOption("chapter", "Chapter")
        .addOption("section", "Section")
        .addOption("paragraph", "Paragraph")
        .addOption("figure", "Figure")
        .addOption("table", "Table")
        .addOption("line", "Line")
        .setValue(this.locatorType)
        .onChange((value) => {
          this.locatorType = asLocatorType(value);
          this.updatePreview();
        }));

    new Setting(this.contentEl)
      .setName("Page, range, or other locator")
      .setDesc("Optional. Examples: 23, 23–27, 4.2, or II.")
      .addText((text) => text
        .setPlaceholder("23–27")
        .onChange((value) => {
          this.locator = value;
          this.updatePreview();
        }));

    new Setting(this.contentEl)
      .setName("Prefix")
      .setDesc("Optional text before the source, for example “see” or “vgl.”.")
      .addText((text) => text
        .setPlaceholder("vgl.")
        .onChange((value) => {
          this.prefix = value;
          this.updatePreview();
        }));

    new Setting(this.contentEl)
      .setName("Suffix")
      .setDesc("Optional text after the locator, for example “emphasis added”.")
      .addText((text) => text
        .setPlaceholder("Hervorhebung hinzugefügt")
        .onChange((value) => {
          this.suffix = value;
          this.updatePreview();
        }));

    const preview = this.contentEl.createDiv({ cls: "markdown-citations-citation-preview" });
    preview.createDiv({ text: "Preview", cls: "markdown-citations-citation-preview-label" });
    this.previewEl = preview.createDiv();
    this.updatePreview();

    new Setting(this.contentEl)
      .setClass("markdown-citations-dialog-actions")
      .addButton((button) => button
        .setButtonText("Cancel")
        .onClick(() => this.close()))
      .addButton((button) => button
        .setButtonText("Insert citation")
        .setCta()
        .onClick(() => {
          this.onInsert(this.options());
          this.close();
        }));
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private options(): CitationRenderOptions {
    return {
      form: this.form,
      locatorType: this.locatorType,
      locator: this.locator,
      prefix: this.prefix,
      suffix: this.suffix,
      locale: this.locale,
    };
  }

  private updatePreview(): void {
    this.previewEl?.setText(this.renderPreview(this.options()));
  }
}

function asLocatorType(value: string): CitationLocatorType {
  const types: readonly CitationLocatorType[] = [
    "page", "pages", "chapter", "section", "paragraph", "figure", "table", "line",
  ];
  return types.includes(value as CitationLocatorType) ? value as CitationLocatorType : "page";
}
