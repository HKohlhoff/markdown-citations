import { TFile, type App } from "obsidian";
import { rebasePublicationLinks } from "../document/publication-links";

/** Keep resolved links from nested folders valid at the publication's location. */
export function createPublicationLinkRebaser(app: App, masterPath: string, outputPath: string): (text: string, sourcePath: string) => string {
  return (text, sourcePath) => {
    if (sourcePath === masterPath) return text;
    return rebasePublicationLinks(text, sourcePath, outputPath, (target, source) => {
      const file = app.metadataCache.getFirstLinkpathDest(target, source);
      return file instanceof TFile ? file.path : undefined;
    });
  };
}
