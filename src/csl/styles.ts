import apa from "../../resources/csl/styles/apa.csl";
import chicagoAuthorDate from "../../resources/csl/styles/chicago-author-date.csl";
import dinAuthorDate from "../../resources/csl/styles/din-1505-2.csl";
import vancouver from "../../resources/csl/styles/elsevier-vancouver.csl";
import harvardCiteThemRight from "../../resources/csl/styles/harvard-cite-them-right.csl";
import ieee from "../../resources/csl/styles/ieee.csl";
import mla from "../../resources/csl/styles/modern-language-association.csl";

export interface BundledCitationStyle {
  id: string;
  title: string;
  fileName: string;
  content: string;
}

export const BUNDLED_CITATION_STYLES: readonly BundledCitationStyle[] = [
  { id: "apa", title: "APA 7th edition", fileName: "apa.csl", content: apa },
  {
    id: "chicago-author-date",
    title: "Chicago Manual of Style 18th edition (author-date)",
    fileName: "chicago-author-date.csl",
    content: chicagoAuthorDate,
  },
  {
    id: "harvard-cite-them-right",
    title: "Cite Them Right 12th edition (author-date/Harvard)",
    fileName: "harvard-cite-them-right.csl",
    content: harvardCiteThemRight,
  },
  {
    id: "modern-language-association",
    title: "MLA Handbook 9th edition (in-text citations)",
    fileName: "modern-language-association.csl",
    content: mla,
  },
  { id: "ieee", title: "IEEE Reference Guide version 11.29.2023", fileName: "ieee.csl", content: ieee },
  {
    id: "elsevier-vancouver",
    title: "Elsevier – NLM/Vancouver (citation-sequence)",
    fileName: "elsevier-vancouver.csl",
    content: vancouver,
  },
  {
    id: "din-1505-2",
    title: "DIN 1505-2 (author-date, Deutsch) – superseded by ISO 690",
    fileName: "din-1505-2.csl",
    content: dinAuthorDate,
  },
];

export function getBundledCitationStyle(id: string): BundledCitationStyle | undefined {
  return BUNDLED_CITATION_STYLES.find((style) => style.id === id);
}
