export type CitationMode = "markdown" | "pandoc";
export type BibliographyPosition = "cursor" | "end";

export interface MarkdownCitationsSettings {
  bibliographyPaths: string[];
  localLibraryPath: string;
  defaultCitationStyle: string;
  defaultLocale: string;
  citationMode: CitationMode;
  bibliographyPosition: BibliographyPosition;
  includeBibliographyHeading: boolean;
  bibliographyHeading: string;
}

export const DEFAULT_SETTINGS: MarkdownCitationsSettings = {
  bibliographyPaths: [],
  localLibraryPath: "Markdown Citations/MarkdownCitations.json",
  defaultCitationStyle: "apa",
  defaultLocale: "de-DE",
  citationMode: "markdown",
  bibliographyPosition: "cursor",
  includeBibliographyHeading: true,
  bibliographyHeading: "Literatur",
};

export function normalizeSettings(value: unknown): MarkdownCitationsSettings {
  const candidate = isRecord(value) ? value : {};
  return {
    bibliographyPaths: normalizePathList(candidate.bibliographyPaths),
    localLibraryPath: normalizePath(candidate.localLibraryPath, DEFAULT_SETTINGS.localLibraryPath),
    defaultCitationStyle: normalizeText(candidate.defaultCitationStyle, DEFAULT_SETTINGS.defaultCitationStyle),
    defaultLocale: normalizeText(candidate.defaultLocale, DEFAULT_SETTINGS.defaultLocale),
    citationMode: candidate.citationMode === "pandoc" ? "pandoc" : "markdown",
    bibliographyPosition: normalizeBibliographyPosition(candidate.bibliographyPosition),
    includeBibliographyHeading: candidate.includeBibliographyHeading !== false,
    bibliographyHeading: normalizeText(candidate.bibliographyHeading, DEFAULT_SETTINGS.bibliographyHeading),
  };
}

function normalizeBibliographyPosition(value: unknown): BibliographyPosition {
  if (value === "end") return value;
  return "cursor";
}

function normalizePathList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const paths = value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => normalizePath(entry, ""))
    .filter((entry) => entry !== "");
  return [...new Set(paths)];
}

function normalizePath(value: unknown, fallback: string): string {
  const text = normalizeText(value, fallback);
  return text.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").replace(/\/{2,}/g, "/");
}

function normalizeText(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed === "" ? fallback : trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
