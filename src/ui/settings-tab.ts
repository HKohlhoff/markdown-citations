import { App, ButtonComponent, normalizePath, PluginSettingTab, Setting, type SettingDefinitionItem } from "obsidian";
import { BUNDLED_CSL_LOCALES } from "../csl/locales";
import { BUNDLED_CITATION_STYLES, getBundledCitationStyle } from "../csl/styles";
import type MarkdownCitationsPlugin from "../main";
import { VaultFileSuggestModal, VaultLibrarySuggestModal } from "./vault-path-modal";

const CUSTOM_STYLE_SENTINEL = "__markdown-citations-custom-style__";
const LOCAL_LIBRARY_FILE_NAME = "MarkdownCitations.json";

export class MarkdownCitationsSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: MarkdownCitationsPlugin) {
    super(app, plugin);
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [{
      name: "Markdown Citations",
      desc: "Configure bibliography sources, citation formatting, bibliography output, and plugin documentation.",
      aliases: [
        "Bibliography files",
        "Local library",
        "Allow frontmatter overrides",
        "Default citation style",
        "Default locale",
        "Bibliography position",
        "Insert bibliography heading",
        "Bibliography heading",
        "Last update",
        "README",
      ],
      render: (setting) => {
        const rootContainer = this.containerEl;
        setting.settingEl.empty();
        setting.settingEl.addClass("markdown-citations-settings-host");
        this.containerEl = setting.settingEl.createDiv();
        this.renderSettings();
        return () => {
          if (setting.settingEl.contains(this.containerEl)) this.containerEl = rootContainer;
        };
      },
    }];
  }

  private renderSettings(): void {
    this.containerEl.empty();
    this.containerEl.addClass("markdown-citations-settings");
    this.renderSources();
    this.renderCitationFormatting();
    this.renderBibliographyOutput();
    this.renderAbout();
  }

  private renderSources(): void {
    new Setting(this.containerEl)
      .setName("Sources")
      .setDesc("Bibliography and local library files are stored as vault-relative paths and work on desktop and mobile.")
      .setHeading();

    new Setting(this.containerEl)
      .setName("Bibliography files")
      .setDesc("Source files: .bib or .json (CSL-JSON). The program used to create them does not matter.")
      .setClass("markdown-citations-section-intro");

    if (this.plugin.settings.bibliographyPaths.length === 0) {
      this.containerEl.createEl("p", {
        text: "No bibliography file selected yet.",
        cls: "markdown-citations-empty-state",
      });
    }

    this.plugin.settings.bibliographyPaths.forEach((path, index) => {
      const setting = new Setting(this.containerEl)
        .setName(`Bibliography ${index + 1}`)
        .setClass("markdown-citations-path-setting");

      setting.addText((text) => {
        text
          .setPlaceholder("Literature/library.bib")
          .setValue(path)
          .onChange(async (value) => {
            this.plugin.settings.bibliographyPaths[index] = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.addClass("markdown-citations-path-input");
      });
      setting.addExtraButton((button) => button
        .setIcon("folder-search-2")
        .setTooltip("Choose bibliography file")
        .onClick(() => this.chooseBibliographyFile(index)));
      setting.addExtraButton((button) => button
        .setIcon("trash-2")
        .setTooltip("Remove bibliography file")
        .onClick(async () => {
          this.plugin.settings.bibliographyPaths.splice(index, 1);
          await this.plugin.saveSettings();
          this.refreshSettings();
        }));
    });

    const addSource = this.containerEl.createDiv({ cls: "markdown-citations-add-source" });
    new ButtonComponent(addSource)
      .setButtonText("Add bibliography file")
      .setCta()
      .onClick(() => this.chooseBibliographyFile());

    new Setting(this.containerEl)
      .setName("Local library")
      .setDesc("One optional .json (CSL-JSON) file managed by Markdown Citations. Leave it empty when the bibliography files above already contain all sources.")
      .setClass("markdown-citations-section-intro");

    const localLibrary = new Setting(this.containerEl)
      .setName("Library file")
      .setClass("markdown-citations-path-setting");
    localLibrary.addText((text) => {
      text
        .setPlaceholder("Optional: choose .json (CSL-JSON)")
        .setValue(this.plugin.settings.localLibraryPath)
        .onChange(async (value) => {
          this.plugin.settings.localLibraryPath = value;
          await this.plugin.saveSettings();
        });
      text.inputEl.addClass("markdown-citations-path-input");
    });
    localLibrary.addExtraButton((button) => button
      .setIcon("folder-search-2")
      .setTooltip("Choose library file or destination folder")
      .onClick(() => {
        new VaultLibrarySuggestModal(this.app, LOCAL_LIBRARY_FILE_NAME, (path) => {
          void this.saveLocalLibraryPath(path);
        }).open();
      }));
    localLibrary.addExtraButton((button) => button
      .setIcon("trash-2")
      .setTooltip("Clear local library path (the file is not deleted)")
      .setDisabled(!this.plugin.settings.localLibraryPath)
      .onClick(async () => {
        this.plugin.settings.localLibraryPath = "";
        await this.plugin.saveSettings();
        this.refreshSettings();
      }));

    const manageLibrary = this.containerEl.createDiv({ cls: "markdown-citations-manage-library" });
    new ButtonComponent(manageLibrary)
      .setButtonText("Manage references")
      .setCta()
      .onClick(() => { void this.plugin.openLocalLibrary(); });
  }

  private renderCitationFormatting(): void {
    new Setting(this.containerEl)
      .setName("Citation formatting")
      .setDesc(`${BUNDLED_CITATION_STYLES.length} CSL styles are installed with the plugin. A custom CSL file can also be selected from this vault.`)
      .setHeading();

    new Setting(this.containerEl)
      .setName("Allow frontmatter overrides")
      .setDesc("Allow style and locale under markdown-citations in frontmatter to override citation style and language for this note. Off by default. All other settings remain global; citation data remains active either way.")
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.allowFrontmatterOverrides)
        .onChange(async value => {
          this.plugin.settings.allowFrontmatterOverrides = value;
          await this.plugin.saveSettings();
        }));

    const currentStyle = this.plugin.settings.defaultCitationStyle;
    const bundledStyle = getBundledCitationStyle(currentStyle);
    const styleSetting = new Setting(this.containerEl)
      .setName("Default citation style")
      .setDesc(bundledStyle
        ? `Installed style: ${bundledStyle.title}`
        : `Custom vault style: ${currentStyle}`)
      .setClass("markdown-citations-select-setting");
    styleSetting.addDropdown((dropdown) => {
      for (const style of BUNDLED_CITATION_STYLES) dropdown.addOption(style.id, style.title);
      if (!bundledStyle && currentStyle) dropdown.addOption(currentStyle, `Custom: ${currentStyle}`);
      dropdown.addOption(CUSTOM_STYLE_SENTINEL, "Choose CSL file from vault…");
      dropdown
        .setValue(currentStyle)
        .onChange(async (value) => {
          if (value === CUSTOM_STYLE_SENTINEL) {
            this.chooseCustomStyle();
            return;
          }
          this.plugin.settings.defaultCitationStyle = value;
          await this.plugin.saveSettings();
          this.refreshSettings();
        });
      dropdown.selectEl.addClass("markdown-citations-wide-select");
    });
    styleSetting.addExtraButton((button) => button
      .setIcon("file-search-2")
      .setTooltip("Choose custom CSL file")
      .onClick(() => this.chooseCustomStyle()));

    new Setting(this.containerEl)
      .setName("Default locale")
      .setDesc("Language used by the citation processor for terms, dates, and punctuation.")
      .setClass("markdown-citations-select-setting")
      .addDropdown((dropdown) => {
        for (const locale of BUNDLED_CSL_LOCALES) dropdown.addOption(locale.id, locale.title);
        dropdown.setValue(this.plugin.settings.defaultLocale)
          .onChange(async (value) => {
          this.plugin.settings.defaultLocale = value;
          await this.plugin.saveSettings();
          });
      });

  }

  private renderBibliographyOutput(): void {
    new Setting(this.containerEl)
      .setName("Bibliography output")
      .setDesc("Defaults used when a generated bibliography is added to a note for the first time.")
      .setHeading();

    new Setting(this.containerEl)
      .setName("Bibliography position")
      .setDesc("Default placement when a bibliography is inserted for the first time.")
      .setClass("markdown-citations-select-setting")
      .addDropdown((dropdown) => dropdown
        .addOption("cursor", "Cursor position")
        .addOption("end", "End of note")
        .setValue(this.plugin.settings.bibliographyPosition)
        .onChange(async (value) => {
          this.plugin.settings.bibliographyPosition = value === "end" ? "end" : "cursor";
          await this.plugin.saveSettings();
        }));

    new Setting(this.containerEl)
      .setName("Insert bibliography heading")
      .setDesc("Turn this off when the bibliography is inserted below an existing heading or in the middle of a note.")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.includeBibliographyHeading)
        .onChange(async (value) => {
          this.plugin.settings.includeBibliographyHeading = value;
          await this.plugin.saveSettings();
          this.refreshSettings();
        }));

    const heading = new Setting(this.containerEl)
      .setName("Bibliography heading")
      .setDesc("Heading written above a generated bibliography.")
      .setDisabled(!this.plugin.settings.includeBibliographyHeading)
      .setClass("markdown-citations-path-setting");
    heading.addText((text) => {
      text
        .setPlaceholder("Literatur")
        .setValue(this.plugin.settings.bibliographyHeading)
        .onChange(async (value) => {
          this.plugin.settings.bibliographyHeading = value;
          await this.plugin.saveSettings();
        });
      text.inputEl.addClass("markdown-citations-path-input");
    });
  }

  private renderAbout(): void {
    new Setting(this.containerEl).setName("About").setHeading();
    new Setting(this.containerEl)
      .setName("Last update")
      .setDesc(`Review the features and usage notes for version ${this.plugin.manifest.version}.`)
      .addButton(button => button.setButtonText("Show last update").onClick(() => this.plugin.showLastUpdate()));
    new Setting(this.containerEl)
      .setName("README")
      .setDesc("Open the complete plugin documentation without leaving Obsidian.")
      .addButton(button => button.setButtonText("Show readme").onClick(() => this.plugin.showReadme()));
  }

  private chooseBibliographyFile(replaceIndex?: number): void {
    new VaultFileSuggestModal(this.app, "bibliography", (file) => {
      void this.saveBibliographyFile(file.path, replaceIndex);
    }).open();
  }

  private async saveBibliographyFile(path: string, replaceIndex?: number): Promise<void> {
    if (replaceIndex === undefined) {
      if (!this.plugin.settings.bibliographyPaths.includes(path)) {
        this.plugin.settings.bibliographyPaths.push(path);
      }
    } else {
      this.plugin.settings.bibliographyPaths[replaceIndex] = path;
    }
    await this.plugin.saveSettings();
    this.refreshSettings();
  }

  private async saveLocalLibraryPath(path: string): Promise<void> {
    this.plugin.settings.localLibraryPath = normalizePath(path);
    await this.plugin.saveSettings();
    this.refreshSettings();
  }

  private chooseCustomStyle(): void {
    new VaultFileSuggestModal(this.app, "csl", (file) => {
      this.plugin.settings.defaultCitationStyle = file.path;
      void this.plugin.saveSettings().then(() => this.refreshSettings());
    }).open();
  }

  private refreshSettings(): void {
    this.renderSettings();
  }
}
