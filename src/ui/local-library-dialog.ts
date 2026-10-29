import { App, Modal, Setting } from "obsidian";
import type { BibliographyItem } from "../model/bibliography";
import { renderCitationLabel } from "../citation/render";

export class LocalLibraryDialog extends Modal {
  constructor(
    app: App,
    private readonly path: string,
    private readonly configured: boolean,
    private readonly items: readonly BibliographyItem[],
    private readonly onCreate: () => void,
    private readonly onEdit: (item: BibliographyItem) => void,
    private readonly onDelete: (item: BibliographyItem) => void,
  ) {
    super(app);
  }

  onOpen(): void {
    this.setTitle("Local reference library");
    this.modalEl.addClass("markdown-citations-local-library-dialog");
    this.contentEl.createEl("p", {
      text: this.configured
        ? `${this.items.length} local reference(s) in ${this.path}. The file remains ordinary CSL-JSON and can be used by other tools.`
        : `No local library file is configured. The first saved reference will create ${this.path} in the vault root.`,
      cls: "markdown-citations-dialog-source",
    });

    const actions = new Setting(this.contentEl).setClass("markdown-citations-local-library-actions");
    actions.addButton(button => button.setButtonText("Create reference").setCta().onClick(() => {
      this.close();
      this.onCreate();
    }));

    if (this.items.length === 0) {
      this.contentEl.createEl("p", {
        text: "No local references yet. Create the first one from bibliographic attributes.",
        cls: "markdown-citations-empty-state",
      });
    }

    for (const item of this.items) {
      const setting = new Setting(this.contentEl)
        .setName(item.csl.title?.trim() || item.citeKey)
        .setDesc(`${renderCitationLabel(item)} · @${item.citeKey}`)
        .setClass("markdown-citations-local-library-item");
      setting.addExtraButton(button => button.setIcon("pencil").setTooltip("Edit reference").onClick(() => {
        this.close();
        this.onEdit(item);
      }));
      setting.addExtraButton(button => button.setIcon("trash-2").setTooltip("Delete reference").onClick(() => {
        this.close();
        this.onDelete(item);
      }));
    }

    new Setting(this.contentEl).setClass("markdown-citations-dialog-actions")
      .addButton(button => button.setButtonText("Close").onClick(() => this.close()));
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class DeleteLocalReferenceDialog extends Modal {
  constructor(
    app: App,
    private readonly item: BibliographyItem,
    private readonly onConfirm: () => Promise<void>,
  ) {
    super(app);
  }

  onOpen(): void {
    this.setTitle("Delete local reference?");
    this.contentEl.createEl("p", {
      text: `Delete “${this.item.csl.title?.trim() || this.item.citeKey}” (@${this.item.citeKey}) from the local library? Existing citation links in notes are not removed and may no longer be updateable.`,
    });
    new Setting(this.contentEl).setClass("markdown-citations-dialog-actions")
      .addButton(button => button.setButtonText("Cancel").onClick(() => this.close()))
      .addButton(button => button.setButtonText("Delete reference").setDestructive().onClick(async () => {
        button.setDisabled(true);
        try {
          await this.onConfirm();
          this.close();
        } finally {
          button.setDisabled(false);
        }
      }));
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
