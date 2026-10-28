import { TFile, type Vault } from "obsidian";
import type { BibliographyItem, BibliographyLoadResult } from "../model/bibliography";
import { parseBibliography } from "./parse";

export async function loadBibliographies(
  vault: Vault,
  configuredPaths: readonly string[],
): Promise<BibliographyLoadResult> {
  const items: BibliographyItem[] = [];
  const errors: BibliographyLoadResult["errors"] = [];
  const seenCiteKeys = new Set<string>();

  for (const path of configuredPaths) {
    const file = vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      errors.push({ path, message: "File not found in the vault." });
      continue;
    }

    try {
      const content = await vault.cachedRead(file);
      for (const item of parseBibliography(content, path)) {
        if (seenCiteKeys.has(item.citeKey)) {
          errors.push({ path, message: `Duplicate citekey ignored: ${item.citeKey}` });
          continue;
        }
        seenCiteKeys.add(item.citeKey);
        items.push(item);
      }
    } catch (error) {
      errors.push({ path, message: errorMessage(error) });
    }
  }

  return { items, errors };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
