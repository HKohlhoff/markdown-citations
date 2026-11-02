import { App, Modal, Setting, TFile, TFolder, normalizePath } from "obsidian";

type VaultFilePurpose = "bibliography" | "json" | "csl";

const PURPOSES: Record<VaultFilePurpose, {
  extensions: readonly string[];
  title: string;
  description: string;
  placeholder: string;
}> = {
  bibliography: {
    extensions: ["bib", "biblatex", "json"],
    title: "Choose bibliography file",
    description: "Enter the exact vault-relative path to a .bib or .json (CSL-JSON) file.",
    placeholder: "Literature/library.bib",
  },
  json: {
    extensions: ["json"],
    title: "Choose CSL-JSON file",
    description: "Enter the exact vault-relative path to an existing .json (CSL-JSON) file.",
    placeholder: "Literature/MarkdownCitations.json",
  },
  csl: {
    extensions: ["csl"],
    title: "Choose CSL file",
    description: "Enter the exact vault-relative path to an existing .csl file.",
    placeholder: "Styles/custom.csl",
  },
};

export class VaultFilePathModal extends Modal {
  private value = "";
  private errorEl?: HTMLElement;

  constructor(
    app: App,
    private readonly purpose: VaultFilePurpose,
    private readonly onChoose: (file: TFile) => void,
  ) {
    super(app);
  }

  onOpen(): void {
    const config = PURPOSES[this.purpose];
    this.setTitle(config.title);
    this.contentEl.createEl("p", { text: config.description });

    new Setting(this.contentEl)
      .setName("Vault-relative path")
      .setClass("markdown-citations-vault-path-field")
      .addText(text => {
        text.setPlaceholder(config.placeholder).onChange(value => {
          this.value = value;
          this.errorEl?.empty();
        });
        window.setTimeout(() => text.inputEl.focus());
      });

    this.errorEl = this.contentEl.createDiv({ cls: "markdown-citations-path-error" });
    new Setting(this.contentEl)
      .setClass("markdown-citations-dialog-actions")
      .addButton(button => button.setButtonText("Cancel").onClick(() => this.close()))
      .addButton(button => button.setButtonText("Choose file").setCta().onClick(() => this.submit()));

    this.scope.register([], "Enter", () => {
      this.submit();
      return false;
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private submit(): void {
    const raw = this.value.trim();
    if (!raw) {
      this.showError("Enter a vault-relative file path.");
      return;
    }

    const path = normalizePath(raw);
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      this.showError(`No file exists at ${path}.`);
      return;
    }

    const extensions = PURPOSES[this.purpose].extensions;
    if (!extensions.includes(file.extension.toLowerCase())) {
      this.showError(`Choose a file ending in ${extensions.map(extension => `.${extension}`).join(" or ")}.`);
      return;
    }

    this.onChoose(file);
    this.close();
  }

  private showError(message: string): void {
    this.errorEl?.setText(message);
  }
}

export class VaultFolderPathModal extends Modal {
  private value = "";
  private errorEl?: HTMLElement;

  constructor(app: App, private readonly onChoose: (folder: TFolder) => void) {
    super(app);
  }

  onOpen(): void {
    this.setTitle("Choose destination folder");
    this.contentEl.createEl("p", {
      text: "Enter the exact vault-relative folder path. Leave it empty to use the vault root.",
    });

    new Setting(this.contentEl)
      .setName("Vault-relative path")
      .setClass("markdown-citations-vault-path-field")
      .addText(text => {
        text.setPlaceholder("Literature").onChange(value => {
          this.value = value;
          this.errorEl?.empty();
        });
        window.setTimeout(() => text.inputEl.focus());
      });

    this.errorEl = this.contentEl.createDiv({ cls: "markdown-citations-path-error" });
    new Setting(this.contentEl)
      .setClass("markdown-citations-dialog-actions")
      .addButton(button => button.setButtonText("Cancel").onClick(() => this.close()))
      .addButton(button => button.setButtonText("Choose folder").setCta().onClick(() => this.submit()));

    this.scope.register([], "Enter", () => {
      this.submit();
      return false;
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private submit(): void {
    const raw = this.value.trim();
    const folder = raw
      ? this.app.vault.getAbstractFileByPath(normalizePath(raw))
      : this.app.vault.getRoot();
    if (!(folder instanceof TFolder)) {
      this.showError(`No folder exists at ${normalizePath(raw)}.`);
      return;
    }

    this.onChoose(folder);
    this.close();
  }

  private showError(message: string): void {
    this.errorEl?.setText(message);
  }
}
