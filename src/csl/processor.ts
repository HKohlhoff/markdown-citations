import CSL from "citeproc";
import type { CitationRenderOptions } from "../citation/render";
import type { BibliographyItem } from "../model/bibliography";
import { getCslLocale } from "./locales";

export interface FormattedBibliographyEntry {
  citeKey: string;
  markdown: string;
}

export function formatCslCitation(
  items: readonly BibliographyItem[],
  citedItem: BibliographyItem,
  options: CitationRenderOptions,
  style: string,
  locale: string,
): string {
  const engine = createEngine(items, style, locale);
  engine.updateItems(items.map((item) => item.citeKey));
  const citationItem = toProcessorCitationItem(citedItem, options);

  if (options.form === "narrative") {
    const author = engine.makeCitationCluster([{ ...citationItem, "author-only": true }]);
    const remainder = engine.makeCitationCluster([{ ...citationItem, "suppress-author": true }]);
    return normalizeCslOutput(`${author} ${remainder}`);
  }

  return normalizeCslOutput(engine.makeCitationCluster([citationItem]));
}

export function formatCslBibliography(
  items: readonly BibliographyItem[],
  style: string,
  locale: string,
): FormattedBibliographyEntry[] {
  if (items.length === 0) return [];
  const engine = createEngine(items, style, locale);
  engine.updateItems(items.map((item) => item.citeKey));
  const bibliography = engine.makeBibliography();
  if (!bibliography) return [];
  const [parameters, entries] = bibliography;
  return entries.map((entry, index) => ({
    citeKey: parameters.entry_ids[index]?.[0] ?? items[index]?.citeKey ?? "",
    markdown: placeBibliographyUrlOnOwnLine(normalizeCslOutput(entry)),
  })).filter((entry) => entry.citeKey !== "");
}

export function normalizeCslOutput(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/giu, "[$2]($1)")
    .replace(/<(?:i|em)>/giu, "*")
    .replace(/<\/(?:i|em)>/giu, "*")
    .replace(/<(?:b|strong)>/giu, "**")
    .replace(/<\/(?:b|strong)>/giu, "**")
    .replace(/<br\s*\/?>/giu, "  \n")
    .replace(/<\/div>\s*<div[^>]*>/giu, " ")
    .replace(/<[^>]+>/gu, "")
    .replace(/\u00a0/gu, " ")
    .replace(/[ \t]+\n/gu, "\n")
    .replace(/[ \t]{2,}/gu, " ")
    .trim();
}

export function placeBibliographyUrlOnOwnLine(markdown: string): string {
  const urlPattern = /\[[^\]\n]+\]\(https?:\/\/[^)\n]+\)|https?:\/\/[^\s<]+/gu;
  let lastUrl = "";
  let lastIndex = -1;
  let match = urlPattern.exec(markdown);
  while (match) {
    lastUrl = match[0];
    lastIndex = match.index;
    match = urlPattern.exec(markdown);
  }
  if (!lastUrl || lastIndex < 0) return markdown;

  const urlStart = lastIndex;
  const urlEnd = urlStart + lastUrl.length;
  const beforeUrl = markdown.slice(0, urlStart);
  const afterUrl = markdown.slice(urlEnd);
  const prefix = /\n[ \t]*$/u.test(beforeUrl) ? beforeUrl : `${beforeUrl.trimEnd()}  \n`;
  const suffix = afterUrl.trim() === "" || /^[ \t]*\n/u.test(afterUrl)
    ? afterUrl
    : `  \n${afterUrl.trimStart()}`;
  return `${prefix}${lastUrl}${suffix}`;
}

function createEngine(
  items: readonly BibliographyItem[],
  style: string,
  locale: string,
): InstanceType<typeof CSL.Engine> {
  const byId = new Map(items.map((item) => [item.citeKey, { ...item.csl, id: item.citeKey }]));
  const localeXml = getCslLocale(locale);
  return new CSL.Engine({
    retrieveLocale: () => localeXml,
    retrieveItem: (id) => byId.get(id),
  }, style, locale, true);
}

function toProcessorCitationItem(
  item: BibliographyItem,
  options: CitationRenderOptions,
): {
  id: string;
  locator?: string;
  label?: string;
  prefix?: string;
  suffix?: string;
} {
  const locator = options.locator?.trim();
  const prefix = options.prefix?.trim();
  const suffix = options.suffix?.trim();
  return {
    id: item.citeKey,
    ...(locator ? { locator, label: processorLocatorLabel(options.locatorType) } : {}),
    ...(prefix ? { prefix } : {}),
    ...(suffix ? { suffix } : {}),
  };
}

function processorLocatorLabel(type: CitationRenderOptions["locatorType"]): string {
  if (type === "pages") return "page";
  return type ?? "page";
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/giu, (_match, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/gu, (_match, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&nbsp;/giu, "\u00a0")
    .replace(/&amp;/giu, "&")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/&quot;/giu, "\"")
    .replace(/&apos;/giu, "'");
}
