import { SuggestModal } from "obsidian";
import type { App } from "obsidian";
import type { BibliographyItem } from "../model/bibliography";
import { renderCitationLabel, searchableText } from "../citation/render";

export class SourceSuggestModal extends SuggestModal<BibliographyItem> {
  constructor(
    app: App,
    private readonly items: readonly BibliographyItem[],
    private readonly onChoose: (item: BibliographyItem) => void,
  ) {
    super(app);
    this.setPlaceholder("Search by author, title, year, or citekey");
    this.setInstructions([
      { command: "↑↓", purpose: "navigate" },
      { command: "↵", purpose: "insert citation" },
      { command: "esc", purpose: "close" },
    ]);
  }

  getSuggestions(query: string): BibliographyItem[] {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return this.items
      .filter((item) => {
        const haystack = searchableText(item);
        return terms.every((term) => haystack.includes(term));
      })
      .slice(0, 100);
  }

  renderSuggestion(item: BibliographyItem, element: HTMLElement): void {
    element.createDiv({
      cls: "markdown-citations-source-title",
      text: item.csl.title?.trim() || item.citeKey,
    });
    element.createDiv({
      cls: "markdown-citations-source-meta",
      text: `${renderCitationLabel(item)} · @${item.citeKey}`,
    });
  }

  onChooseSuggestion(item: BibliographyItem): void {
    this.onChoose(item);
  }
}
