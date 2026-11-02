import apa from "../../resources/csl/styles/apa.csl";
import chicagoAuthorDate from "../../resources/csl/styles/chicago-author-date.csl";
import isoAuthorDate from "../../resources/csl/styles/iso690-author-date-localized.csl";
import vancouver from "../../resources/csl/styles/nlm-citation-sequence.csl";
import aps from "../../resources/csl/styles/american-physics-society.csl";
import ams from "../../resources/csl/styles/ams-numeric-alphabetical.csl";
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
  { id: "ieee", title: "IEEE – Technik und Informatik (numerisch)", fileName: "ieee.csl", content: ieee },
  {
    id: "nlm-citation-sequence",
    title: "NLM/Vancouver – Medizin (numerisch)",
    fileName: "nlm-citation-sequence.csl",
    content: vancouver,
  },
  {
    id: "iso690-author-date-localized",
    title: "ISO 690:2021 – Autor/Jahr (DE/EN, angepasst)",
    fileName: "iso690-author-date-localized.csl",
    content: isoAuthorDate,
  },
  {
    id: "american-physics-society",
    title: "APS / Physical Review – Physik (numerisch)",
    fileName: "american-physics-society.csl",
    content: aps,
  },
  {
    id: "ams-numeric-alphabetical",
    title: "AMS – Mathematik (numerisch, alphabetisch; angepasst)",
    fileName: "ams-numeric-alphabetical.csl",
    content: ams,
  },
];

export function getBundledCitationStyle(id: string): BundledCitationStyle | undefined {
  return BUNDLED_CITATION_STYLES.find((style) => style.id === id);
}
