import { excludedDocumentRanges } from "./citations";

export function rebasePublicationLinks(
  text: string, sourcePath: string, outputPath: string,
  resolvePath: (target: string, sourcePath: string) => string | undefined,
): string {
  const excluded = excludedDocumentRanges(text);
  const rebase = (target: string, wiki: boolean): string => {
    if (!target || target.startsWith("#") || /^[a-z][a-z\d+.-]*:|^\/\//iu.test(target)) return target;
    let decoded: string;
    try { decoded = decodeURI(target); } catch { return target; }
    const hash = decoded.indexOf("#");
    const path = hash < 0 ? decoded : decoded.slice(0, hash);
    const fragment = hash < 0 ? "" : decoded.slice(hash);
    const resolved = resolvePath(path, sourcePath);
    if (!resolved) return target;
    if (wiki) return resolved + fragment;
    const from = outputPath.split("/").slice(0, -1);
    const to = resolved.split("/");
    while (from.length && to.length && from[0] === to[0]) { from.shift(); to.shift(); }
    return [...from.map(() => ".."), ...to].map(part => encodeURIComponent(part)).join("/") + fragment;
  };
  const pattern = /(!?\[\[)([^\]\n]+)(\]\])|(!?\[[^\]\n]*\]\()(<[^>\n]+>|[^\s)\n]+)([^)\n]*\))/gu;
  return text.replace(pattern, (whole: string, wikiOpen: string | undefined, wikiBody: string | undefined, wikiClose: string | undefined,
    mdOpen: string | undefined, mdTarget: string | undefined, mdClose: string | undefined, offset: number) => {
    if (excluded.some(([start, end]) => offset >= start && offset < end)) return whole;
    if (wikiOpen && wikiBody) {
      const separator = wikiBody.indexOf("|");
      const target = separator < 0 ? wikiBody : wikiBody.slice(0, separator);
      const alias = separator < 0 ? "" : wikiBody.slice(separator);
      return wikiOpen + rebase(target, true) + alias + wikiClose;
    }
    if (!mdTarget) return whole;
    const angle = mdTarget.startsWith("<");
    const next = rebase(angle ? mdTarget.slice(1, -1) : mdTarget, false);
    return mdOpen + (angle ? `<${next}>` : next) + mdClose;
  });
}
