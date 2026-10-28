import type { CSLName } from "@citation-js/core";
import type { BibliographyItem } from "../model/bibliography";

export function renderMarkdownCitation(item: BibliographyItem): string {
  const label = renderCitationLabel(item);
  return `[${label}](#${bibliographyAnchor(item.citeKey)})`;
}

export function renderCitationLabel(item: BibliographyItem): string {
  return `(${shortAuthorLabel(item)}, ${issuedYear(item)})`;
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

function escapeMarkdown(value: string): string {
  return value.replace(/([\\*_[\]])/g, "\\$1");
}
