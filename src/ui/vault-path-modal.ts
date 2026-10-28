import { App, SuggestModal, TFile, TFolder } from "obsidian";

type VaultFilePurpose = "bibliography" | "json" | "csl";

const PURPOSES: Record<VaultFilePurpose, { extensions: readonly string[]; placeholder: string; empty: string }> = {
  bibliography: {
    extensions: ["bib", "biblatex", "json"],
    placeholder: "Search bibliography files in this vault…",
    empty: "No BibTeX, BibLaTeX, or CSL-JSON files found.",
  },
  json: {
    extensions: ["json"],
    placeholder: "Search JSON files in this vault…",
    empty: "No JSON files found.",
  },
  csl: {
    extensions: ["csl"],
    placeholder: "Search CSL style files in this vault…",
    empty: "No CSL style files found.",
  },
};

export class VaultFileSuggestModal extends SuggestModal<TFile> {
  private readonly files: TFile[];

  constructor(
    app: App,
    purpose: VaultFilePurpose,
    private readonly onChoose: (file: TFile) => void,
  ) {
    super(app);
    const config = PURPOSES[purpose];
    const extensions = new Set(config.extensions);
    this.files = app.vault.getFiles()
      .filter((file) => extensions.has(file.extension.toLowerCase()))
      .sort((left, right) => left.path.localeCompare(right.path));
    this.setPlaceholder(config.placeholder);
    this.emptyStateText = config.empty;
    this.setInstructions([
      { command: "↑↓", purpose: "navigate" },
      { command: "↵", purpose: "select" },
      { command: "esc", purpose: "close" },
    ]);
  }

  getSuggestions(query: string): TFile[] {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return this.files;
    return this.files.filter((file) => file.path.toLocaleLowerCase().includes(normalized));
  }

  renderSuggestion(file: TFile, element: HTMLElement): void {
    element.createDiv({ text: file.name, cls: "markdown-citations-picker-title" });
    element.createDiv({ text: file.parent?.path || "Vault root", cls: "markdown-citations-picker-path" });
  }

  onChooseSuggestion(file: TFile): void {
    this.onChoose(file);
  }
}

export class VaultFolderSuggestModal extends SuggestModal<TFolder> {
  private readonly folders: TFolder[];

  constructor(app: App, private readonly onChoose: (folder: TFolder) => void) {
    super(app);
    this.folders = app.vault.getAllFolders(true)
      .sort((left, right) => left.path.localeCompare(right.path));
    this.setPlaceholder("Search folders in this vault…");
    this.emptyStateText = "No matching folder found.";
    this.setInstructions([
      { command: "↑↓", purpose: "navigate" },
      { command: "↵", purpose: "select" },
      { command: "esc", purpose: "close" },
    ]);
  }

  getSuggestions(query: string): TFolder[] {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return this.folders;
    return this.folders.filter((folder) => {
      const label = folder.isRoot() ? "vault root" : folder.path;
      return label.toLocaleLowerCase().includes(normalized);
    });
  }

  renderSuggestion(folder: TFolder, element: HTMLElement): void {
    const path = folder.isRoot() ? "Vault root" : folder.path;
    element.createDiv({ text: path, cls: "markdown-citations-picker-title" });
  }

  onChooseSuggestion(folder: TFolder): void {
    this.onChoose(folder);
  }
}
