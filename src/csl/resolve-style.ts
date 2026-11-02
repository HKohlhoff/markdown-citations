import { TFile, type Vault } from "obsidian";
import { getBundledCitationStyle } from "./styles";

export async function resolveCitationStyle(vault: Vault, configuredStyle: string): Promise<string> {
  const bundled = getBundledCitationStyle(configuredStyle);
  if (bundled) return bundled.content;

  const file = vault.getAbstractFileByPath(configuredStyle);
  if (!(file instanceof TFile) || file.extension.toLowerCase() !== "csl") {
    throw new Error(`CSL style not found in the vault: ${configuredStyle}`);
  }
  return vault.cachedRead(file);
}
