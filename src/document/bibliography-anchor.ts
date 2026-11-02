const BIBLIOGRAPHY_SCROLL_MARGIN = "5rem";

export function renderBibliographyAnchor(id: string): string {
  return `<a id="${id}" style="scroll-margin-top: ${BIBLIOGRAPHY_SCROLL_MARGIN};"></a>`;
}

export function findBibliographyAnchorOffset(content: string, id: string): number {
  return content.indexOf(renderBibliographyAnchor(id));
}
