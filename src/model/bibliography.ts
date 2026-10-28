import type { CSL } from "@citation-js/core";

export interface BibliographyItem {
  citeKey: string;
  sourcePath: string;
  csl: CSL;
}

export interface BibliographyLoadError {
  path: string;
  message: string;
}

export interface BibliographyLoadResult {
  items: BibliographyItem[];
  errors: BibliographyLoadError[];
}
