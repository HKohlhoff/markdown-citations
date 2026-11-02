import { Cite, type CSL } from "@citation-js/core";
import "@citation-js/plugin-bibtex";
import type { BibliographyItem } from "../model/bibliography";

export function parseBibliography(content: string, sourcePath: string): BibliographyItem[] {
  const trimmed = content.trim();
  if (trimmed === "") return [];

  let records: CSL[];
  try {
    records = new Cite(parseInput(trimmed, sourcePath)).data;
  } catch (error) {
    throw new Error(`Could not parse ${sourcePath}: ${errorMessage(error)}`);
  }

  return records.map((csl, index) => ({
    citeKey: readCiteKey(csl, index),
    sourcePath,
    csl,
  }));
}

function parseInput(content: string, sourcePath: string): string | object | object[] {
  if (sourcePath.toLowerCase().endsWith(".json")) {
    try {
      return JSON.parse(content) as object | object[];
    } catch (error) {
      throw new Error(`Invalid JSON: ${errorMessage(error)}`);
    }
  }
  return content;
}

function readCiteKey(csl: CSL, index: number): string {
  const candidate = typeof csl["citation-key"] === "string" && csl["citation-key"].trim() !== ""
    ? csl["citation-key"]
    : String(csl.id);
  const citeKey = candidate.trim();
  if (citeKey === "") throw new Error(`Entry ${index + 1} has no citekey or id.`);
  return citeKey;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
