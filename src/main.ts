import { Notice, Plugin } from "obsidian";
import { normalizePluginData, type MarkdownCitationsData } from "./plugin-data";
import { normalizeSettings, type MarkdownCitationsSettings } from "./settings-data";
import { MarkdownCitationsSettingTab } from "./ui/settings-tab";

export default class MarkdownCitationsPlugin extends Plugin {
  settings: MarkdownCitationsSettings = normalizeSettings({});
  private data: MarkdownCitationsData = normalizePluginData({});

  async onload(): Promise<void> {
    this.data = normalizePluginData(await this.loadData());
    this.settings = this.data.settings;
    this.addSettingTab(new MarkdownCitationsSettingTab(this.app, this));
    this.addCommand({
      id: "show-setup-status",
      name: "Show setup status",
      callback: () => {
        const count = this.settings.bibliographyPaths.length;
        new Notice(
          `Markdown Citations is loaded with ${count} configured bibliography file(s). Citation commands will be added in the next development step.`,
          6000,
        );
      },
    });
  }

  async saveSettings(): Promise<void> {
    this.settings = normalizeSettings(this.settings);
    this.data.settings = this.settings;
    await this.saveData(this.data);
  }
}
