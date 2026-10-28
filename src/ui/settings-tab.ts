import { App, PluginSettingTab, Setting } from "obsidian";
import type MarkdownCitationsPlugin from "../main";

export class MarkdownCitationsSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: MarkdownCitationsPlugin) {
    super(app, plugin);
  }

  display(): void {
    this.containerEl.empty();
    this.containerEl.createEl("p", {
      text: "These settings establish the source and output defaults. Individual notes will later be able to override them through frontmatter.",
    });

    new Setting(this.containerEl)
      .setName("Bibliography files")
      .setDesc("Vault-relative BibTeX, BibLaTeX, or CSL-JSON paths, one per line.")
      .addTextArea((text) => text
        .setPlaceholder("Literature/library.bib")
        .setValue(this.plugin.settings.bibliographyPaths.join("\n"))
        .onChange(async (value) => {
          this.plugin.settings.bibliographyPaths = value.split("\n");
          await this.plugin.saveSettings();
        }));

    new Setting(this.containerEl)
      .setName("Local library")
      .setDesc("Vault-relative CSL-JSON file managed by Markdown Citations.")
      .addText((text) => text
        .setPlaceholder("Markdown Citations/MarkdownCitations.json")
        .setValue(this.plugin.settings.localLibraryPath)
        .onChange(async (value) => {
          this.plugin.settings.localLibraryPath = value;
          await this.plugin.saveSettings();
        }));

    new Setting(this.containerEl)
      .setName("Default citation style")
      .setDesc("CSL style name or a vault-relative CSL file path.")
      .addText((text) => text
        .setPlaceholder("apa")
        .setValue(this.plugin.settings.defaultCitationStyle)
        .onChange(async (value) => {
          this.plugin.settings.defaultCitationStyle = value;
          await this.plugin.saveSettings();
        }));

    new Setting(this.containerEl)
      .setName("Default locale")
      .setDesc("Locale used by the CSL engine, for example de-DE or en-US.")
      .addText((text) => text
        .setPlaceholder("de-DE")
        .setValue(this.plugin.settings.defaultLocale)
        .onChange(async (value) => {
          this.plugin.settings.defaultLocale = value;
          await this.plugin.saveSettings();
        }));

    new Setting(this.containerEl)
      .setName("Citation mode")
      .setDesc("Readable Markdown is intended for direct publication; Pandoc syntax is intended for later document conversion.")
      .addDropdown((dropdown) => dropdown
        .addOption("markdown", "Readable Markdown")
        .addOption("pandoc", "Pandoc")
        .setValue(this.plugin.settings.citationMode)
        .onChange(async (value) => {
          this.plugin.settings.citationMode = value === "pandoc" ? "pandoc" : "markdown";
          await this.plugin.saveSettings();
        }));

    new Setting(this.containerEl)
      .setName("Bibliography position")
      .setDesc("Default placement when a bibliography is inserted for the first time.")
      .addDropdown((dropdown) => dropdown
        .addOption("cursor", "Cursor position")
        .addOption("end", "End of note")
        .addOption("placeholder", "Existing placeholder")
        .setValue(this.plugin.settings.bibliographyPosition)
        .onChange(async (value) => {
          this.plugin.settings.bibliographyPosition =
            value === "end" || value === "placeholder" ? value : "cursor";
          await this.plugin.saveSettings();
        }));

    new Setting(this.containerEl)
      .setName("Bibliography heading")
      .setDesc("Default heading used for a generated bibliography.")
      .addText((text) => text
        .setPlaceholder("Literatur")
        .setValue(this.plugin.settings.bibliographyHeading)
        .onChange(async (value) => {
          this.plugin.settings.bibliographyHeading = value;
          await this.plugin.saveSettings();
        }));
  }
}
