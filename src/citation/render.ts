import type { CSLName } from "@citation-js/core";
import type { BibliographyItem } from "../model/bibliography";

export type CitationForm = "parenthetical" | "narrative";
export type CitationLocatorType = "page" | "pages" | "chapter" | "section" | "paragraph" | "figure" | "table" | "line";

export interface CitationRenderOptions {
  form?: CitationForm;
  locatorType?: CitationLocatorType;
  locator?: string;
  prefix?: string;
  suffix?: string;
  locale?: string;
}

export function renderMarkdownCitation(
  item: BibliographyItem,
  options: CitationRenderOptions = {},
): string {
  const label = renderCitationLabel(item, options);
  return `[${label}](#${bibliographyAnchor(item.citeKey)})`;
}

export function renderCitationLabel(
  item: BibliographyItem,
  options: CitationRenderOptions = {},
): string {
  const author = shortAuthorLabel(item);
  const yearAndDetails = [
    issuedYear(item),
    renderLocator(options),
    options.suffix?.trim(),
  ].filter((value): value is string => Boolean(value));
  const prefix = options.prefix?.trim();
  if (options.form === "narrative") {
    return `${prefix ? `${prefix} ` : ""}${author} (${yearAndDetails.join(", ")})`;
  }
  const prefixedAuthor = prefix ? `${prefix} ${author}` : author;
  return `(${[prefixedAuthor, ...yearAndDetails].join(", ")})`;
}

export function renderBibliographyEntry(item: BibliographyItem): string {
  const author = longAuthorLabel(item);
  const year = issuedYear(item);
  const title = escapeMarkdown(item.csl.title?.trim() || item.citeKey);
  const url = item.csl.URL?.trim();
  const base = `${author} (${year}). *${title}*.`;
  return url ? `${base} [${escapeMarkdown(url)}](${url})` : base;
}

export function bibliographyAnchor(citeKey: string): string {
  const normalized = citeKey
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_.:-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `ref-${normalized || "source"}`;
}

export function searchableText(item: BibliographyItem): string {
  return [
    item.citeKey,
    item.csl.title,
    item.csl["container-title"],
    issuedYear(item),
    ...names(item),
  ].filter((value): value is string => typeof value === "string").join(" ").toLowerCase();
}

function shortAuthorLabel(item: BibliographyItem): string {
  const authors = names(item);
  if (authors.length === 0) return item.csl.title?.trim() || item.citeKey;
  if (authors.length === 1) return authors[0] ?? item.citeKey;
  if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
  return `${authors[0]} et al.`;
}

function longAuthorLabel(item: BibliographyItem): string {
  const authors = item.csl.author ?? [];
  if (authors.length === 0) return item.csl.title?.trim() || item.citeKey;
  return authors.map(formatFullName).join(", ");
}

function names(item: BibliographyItem): string[] {
  return (item.csl.author ?? []).map((author) =>
    author.family?.trim() || author.literal?.trim() || author.given?.trim() || "",
  ).filter((name) => name !== "");
}

function formatFullName(name: CSLName): string {
  if (name.literal?.trim()) return name.literal.trim();
  const family = name.family?.trim() ?? "";
  const given = name.given?.trim() ?? "";
  if (family && given) return `${family}, ${given}`;
  return family || given || "Unknown";
}

function issuedYear(item: BibliographyItem): string {
  const year = item.csl.issued?.["date-parts"]?.[0]?.[0];
  return year === undefined ? "n.d." : String(year);
}

function renderLocator(options: CitationRenderOptions): string | undefined {
  const locator = options.locator?.trim();
  if (!locator) return undefined;
  const type = options.locatorType ?? "page";
  const german = options.locale?.toLowerCase().startsWith("de") ?? false;
  const labels: Record<CitationLocatorType, readonly [string, string]> = {
    page: ["p.", "S."],
    pages: ["pp.", "S."],
    chapter: ["chap.", "Kap."],
    section: ["sec.", "Abschn."],
    paragraph: ["para.", "Abs."],
    figure: ["fig.", "Abb."],
    table: ["tbl.", "Tab."],
    line: ["line", "Z."],
  };
  return `${labels[type][german ? 1 : 0]} ${locator}`;
}

function escapeMarkdown(value: string): string {
  return value.replace(/([\\*_[\]])/g, "\\$1");
}
