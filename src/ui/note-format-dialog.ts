import { App, Modal, Notice, Setting } from "obsidian";
import { BUNDLED_CSL_LOCALES, cslLocaleTitle } from "../csl/locales";
import { BUNDLED_CITATION_STYLES } from "../csl/styles";
import { VaultFileSuggestModal } from "./vault-path-modal";

export interface NoteFormat {
  style: string;
  locale: string;
}

export class NoteFormatDialog extends Modal {
  private saving = false;
  private customStyles = new Map<string, string>();

  constructor(
    app: App,
    private readonly noteFormat: NoteFormat,
    private readonly global: NoteFormat,
    private readonly onSave: (format: NoteFormat, update: boolean) => Promise<void>,
  ) {
    super(app);
    for (const style of [noteFormat.style, global.style]) {
      if (style && !BUNDLED_CITATION_STYLES.some(entry => entry.id === style)) this.customStyles.set(style, `Custom: ${style}`);
    }
  }

  onOpen(): void {
    this.setTitle("Citation style and language for this note");
    this.modalEl.addClass("markdown-citations-note-format-dialog");
    this.render();
  }

  private render(): void {
    this.contentEl.empty();
    this.contentEl.createEl("p", { text: "Save style and locale under markdown-citations in this note's frontmatter. Save only, or save and update existing citations and the bibliography together." });
    const globalTitle = BUNDLED_CITATION_STYLES.find(style => style.id === this.global.style)?.title ?? this.global.style;
    const styleSetting = new Setting(this.contentEl)
      .setName("Citation style")
      .setClass("markdown-citations-select-setting");
    styleSetting.addDropdown(dropdown => {
      dropdown.addOption("", `Use global default: ${globalTitle}`);
      for (const style of BUNDLED_CITATION_STYLES) dropdown.addOption(style.id, style.title);
      for (const [id, title] of this.customStyles) dropdown.addOption(id, title);
      dropdown.addOption("__choose_csl__", "Choose CSL file from vault…");
      dropdown.setValue(this.noteFormat.style).onChange(value => {
        if (value === "__choose_csl__") {
          dropdown.setValue(this.noteFormat.style);
          this.chooseCustomStyle();
        } else this.noteFormat.style = value;
      });
      dropdown.selectEl.addClass("markdown-citations-wide-select");
    });
    styleSetting.addExtraButton(button => button.setIcon("file-search-2")
      .setTooltip("Choose custom CSL file").onClick(() => this.chooseCustomStyle()));
    new Setting(this.contentEl)
      .setName("Locale")
      .setDesc("Language used by the citation processor for terms, dates, and punctuation.")
      .setClass("markdown-citations-select-setting")
      .addDropdown(dropdown => {
        dropdown.addOption("", `Use global default: ${cslLocaleTitle(this.global.locale)}`);
        for (const locale of BUNDLED_CSL_LOCALES) dropdown.addOption(locale.id, locale.title);
        dropdown.setValue(this.noteFormat.locale)
          .onChange(value => { this.noteFormat.locale = value; });
      });
    const actions = new Setting(this.contentEl).setClass("markdown-citations-note-format-actions");
    actions.addButton(button => button.setButtonText("Cancel").onClick(() => this.close()));
    for (const update of [false, true]) {
      actions.addButton(button => {
        button.setButtonText(update ? "Save to frontmatter and update citations" : "Save to frontmatter");
        if (update) button.setCta();
        button.onClick(async () => {
          if (this.saving) return;
          this.saving = true;
          button.setDisabled(true);
          try {
            await this.onSave({ ...this.noteFormat }, update);
            this.close();
          } catch (error) {
            new Notice(`Could not save note citation settings: ${error instanceof Error ? error.message : String(error)}`, 9000);
          } finally {
            this.saving = false;
            button.setDisabled(false);
          }
        });
      });
    }
  }

  private chooseCustomStyle(): void {
    new VaultFileSuggestModal(this.app, "csl", file => {
      this.customStyles.set(file.path, `Custom: ${file.path}`);
      this.noteFormat.style = file.path;
      this.render();
    }).open();
  }
}
