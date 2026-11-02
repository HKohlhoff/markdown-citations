import { normalizePath, TFile, TFolder, type Vault } from "obsidian";
import type { CSL } from "@citation-js/core";
import {
  parseLocalLibrary,
  removeLocalReference,
  serializeLocalLibrary,
  upsertLocalReference,
  type LocalReferenceInput,
} from "../bibliography/local-library";
import type { BibliographyItem } from "../model/bibliography";

export async function readLocalLibrary(vault: Vault, path: string): Promise<BibliographyItem[]> {
  const normalized = validateLocalLibraryPath(path);
  const file = vault.getAbstractFileByPath(normalized);
  if (!file) return [];
  if (!(file instanceof TFile)) throw new Error(`Local library path is not a file: ${normalized}`);
  const records = parseLocalLibrary(await vault.cachedRead(file), normalized);
  return records.map(record => ({ citeKey: readCiteKey(record), sourcePath: normalized, csl: record }));
}

export async function saveLocalReference(
  vault: Vault,
  path: string,
  input: LocalReferenceInput,
  originalCiteKey?: string,
): Promise<void> {
  await updateLocalLibrary(vault, path, records => upsertLocalReference(records, input, originalCiteKey));
}

export async function deleteLocalReference(vault: Vault, path: string, citeKey: string): Promise<void> {
  await updateLocalLibrary(vault, path, records => removeLocalReference(records, citeKey));
}

export async function ensureLocalLibrary(vault: Vault, path: string): Promise<string> {
  const normalized = validateLocalLibraryPath(path);
  const existing = vault.getAbstractFileByPath(normalized);
  if (existing instanceof TFile) return normalized;
  if (existing) throw new Error(`Local library path is not a file: ${normalized}`);
  await ensureParentFolder(vault, normalized);
  await vault.create(normalized, serializeLocalLibrary([]));
  return normalized;
}

async function updateLocalLibrary(
  vault: Vault,
  path: string,
  update: (records: readonly CSL[]) => CSL[],
): Promise<void> {
  const normalized = await ensureLocalLibrary(vault, path);
  const file = vault.getAbstractFileByPath(normalized);
  if (!(file instanceof TFile)) throw new Error(`Local library file not found: ${normalized}`);
  await vault.process(file, content => serializeLocalLibrary(update(parseLocalLibrary(content, normalized))));
}

async function ensureParentFolder(vault: Vault, filePath: string): Promise<void> {
  const parts = filePath.split("/").slice(0, -1);
  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    const existing = vault.getAbstractFileByPath(current);
    if (existing instanceof TFolder) continue;
    if (existing) throw new Error(`Cannot create local library folder because a file exists at ${current}.`);
    await vault.createFolder(current);
  }
}

function validateLocalLibraryPath(path: string): string {
  const normalized = normalizePath(path.trim());
  if (!normalized || normalized === "/") throw new Error("Choose a local library file first.");
  if (normalized.split("/").some(part => part === "." || part === "..")) {
    throw new Error("The local library path must stay inside the vault.");
  }
  if (!normalized.toLowerCase().endsWith(".json")) throw new Error("The local library must be a .json (CSL-JSON) file.");
  return normalized.replace(/^\/+|\/+$/gu, "");
}

function readCiteKey(record: CSL): string {
  const candidate = typeof record["citation-key"] === "string" && record["citation-key"].trim()
    ? record["citation-key"] : String(record.id);
  return candidate.trim();
}
