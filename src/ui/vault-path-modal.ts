import { App, FuzzySuggestModal, TFile, TFolder } from "obsidian";

type VaultFilePurpose = "bibliography" | "csl";
type LibraryLocation =
  | { kind: "file"; file: TFile }
  | { kind: "folder"; folder: TFolder; fileName: string };

const PURPOSES: Record<VaultFilePurpose, { extensions: readonly string[]; placeholder: string; empty: string }> = {
  bibliography: {
    extensions: ["bib", "biblatex", "json"],
    placeholder: "Search bibliography files in this vault…",
    empty: "No bibliography files found: .bib or .json (CSL-JSON).",
  },
  csl: {
    extensions: ["csl"],
    placeholder: "Search CSL style files in this vault…",
    empty: "No CSL style files found.",
  },
};

function collectVaultFiles(folder: TFolder, extensions: ReadonlySet<string>, files: TFile[] = []): TFile[] {
  for (const child of folder.children) {
    if (child instanceof TFolder) collectVaultFiles(child, extensions, files);
    else if (child instanceof TFile && extensions.has(child.extension.toLowerCase())) files.push(child);
  }
  return files;
}

function collectVaultFolders(folder: TFolder, folders: TFolder[] = []): TFolder[] {
  folders.push(folder);
  for (const child of folder.children) {
    if (child instanceof TFolder) collectVaultFolders(child, folders);
  }
  return folders;
}

export class VaultFileSuggestModal extends FuzzySuggestModal<TFile> {
  private readonly extensions: ReadonlySet<string>;

  constructor(
    app: App,
    purpose: VaultFilePurpose,
    private readonly onChoose: (file: TFile) => void,
  ) {
    super(app);
    const config = PURPOSES[purpose];
    this.extensions = new Set(config.extensions);
    this.setPlaceholder(config.placeholder);
    this.emptyStateText = config.empty;
  }

  getItems(): TFile[] {
    return collectVaultFiles(this.app.vault.getRoot(), this.extensions)
      .sort((left, right) => left.path.localeCompare(right.path, "en"));
  }

  getItemText(file: TFile): string {
    return file.path;
  }

  onChooseItem(file: TFile): void {
    this.onChoose(file);
  }
}

export class VaultLibrarySuggestModal extends FuzzySuggestModal<LibraryLocation> {
  constructor(
    app: App,
    private readonly fileName: string,
    private readonly onChoose: (path: string) => void,
  ) {
    super(app);
    this.setPlaceholder("Choose an existing CSL-JSON file or a destination folder…");
    this.emptyStateText = "No matching CSL-JSON file or folder found.";
  }

  getItems(): LibraryLocation[] {
    const root = this.app.vault.getRoot();
    const files = collectVaultFiles(root, new Set(["json"]))
      .map((file): LibraryLocation => ({ kind: "file", file }));
    const folders = collectVaultFolders(root)
      .map((folder): LibraryLocation => ({ kind: "folder", folder, fileName: this.fileName }));
    return [...files, ...folders].sort((left, right) => this.locationPath(left).localeCompare(this.locationPath(right), "en"));
  }

  getItemText(location: LibraryLocation): string {
    if (location.kind === "file") return `File · ${location.file.path}`;
    const folder = location.folder.isRoot() ? "Vault root" : location.folder.path;
    return `Folder · ${folder} → ${location.fileName}`;
  }

  onChooseItem(location: LibraryLocation): void {
    this.onChoose(this.locationPath(location));
  }

  private locationPath(location: LibraryLocation): string {
    if (location.kind === "file") return location.file.path;
    return location.folder.isRoot()
      ? location.fileName
      : `${location.folder.path}/${location.fileName}`;
  }
}
