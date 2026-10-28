declare module "*.csl" {
  const content: string;
  export default content;
}

declare module "*.xml" {
  const content: string;
  export default content;
}

declare module "*.md" {
  const content: string;
  export default content;
}

declare module "citeproc" {
  interface CitationItem {
    id: string;
    locator?: string;
    label?: string;
    prefix?: string;
    suffix?: string;
    "author-only"?: boolean;
    "suppress-author"?: boolean;
  }

  interface ProcessorSystem {
    retrieveLocale(language: string): string;
    retrieveItem(id: string): unknown;
  }

  interface BibliographyParameters {
    entry_ids: string[][];
  }

  export class Engine {
    constructor(system: ProcessorSystem, style: string, language?: string, forceLanguage?: boolean);
    setOutputFormat(format: "html" | "text" | "rtf"): void;
    updateItems(ids: string[]): void;
    makeCitationCluster(items: CitationItem[]): string;
    makeBibliography(): [BibliographyParameters, string[]] | false;
  }

  const CSL: { Engine: typeof Engine };
  export default CSL;
}
