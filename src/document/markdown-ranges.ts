import { frontmatterRange } from "./citation-frontmatter";

export const BIBLIOGRAPHY_START = "<!-- markdown-citations:bibliography:start -->";
export const BIBLIOGRAPHY_END = "<!-- markdown-citations:bibliography:end -->";
export const BIBLIOGRAPHY_PLACEHOLDER = "<!-- markdown-citations:bibliography -->";

export function syntaxRanges(content: string): [number, number][] {
  const ranges: [number, number][] = [];
  const frontmatter = frontmatterRange(content);
  if (frontmatter) ranges.push([0, frontmatter.bodyStart]);
  let fence: { char: string; length: number; start: number } | undefined;
  for (const line of content.matchAll(/^.*(?:\n|$)/gmu)) {
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/u.exec(line[0].trimEnd());
    if (!marker?.[1]) continue;
    if (!fence) fence = { char: marker[1][0] ?? "`", length: marker[1].length, start: line.index };
    else if (marker[1][0] === fence.char && marker[1].length >= fence.length && !marker[2]?.trim()) {
      ranges.push([fence.start, line.index + line[0].length]);
      fence = undefined;
    }
  }
  if (fence) ranges.push([fence.start, content.length]);
  for (const match of content.matchAll(/(`+)[\s\S]*?\1|<!--[\s\S]*?-->/gu)) ranges.push([match.index, match.index + match[0].length]);
  return ranges;
}

function markerPositions(content: string, marker: string): number[] {
  const excluded = syntaxRanges(content);
  const positions: number[] = [];
  let offset = content.indexOf(marker);
  while (offset >= 0) {
    const index = offset;
    const masked = excluded.some(([start, end]) => index >= start && index < end
      && !(start === index && end === index + marker.length));
    if (!masked) positions.push(index);
    offset = content.indexOf(marker, offset + marker.length);
  }
  return positions;
}

export function bibliographyRange(content: string): { start: number; end: number } | undefined {
  const starts = markerPositions(content, BIBLIOGRAPHY_START);
  const ends = markerPositions(content, BIBLIOGRAPHY_END);
  if (!starts.length && !ends.length) return undefined;
  if (starts.length !== 1 || ends.length !== 1 || ends[0]! < starts[0]!) {
    throw new Error("The bibliography ownership markers are incomplete or duplicated. Repair them before updating.");
  }
  return { start: starts[0]!, end: ends[0]! + BIBLIOGRAPHY_END.length };
}

export function bibliographyPlaceholder(content: string): number {
  return markerPositions(content, BIBLIOGRAPHY_PLACEHOLDER)[0] ?? -1;
}
