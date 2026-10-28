import { TFile, type App } from "obsidian";
import { excludedDocumentRanges } from "../document/citations";

/** Keep resolved links from nested folders valid at the publication's location. */
export function createPublicationLinkRebaser(app: App, masterPath: string, outputPath: string): (text: string, sourcePath: string) => string {
  return (text, sourcePath) => {
    if (sourcePath === masterPath) return text;
    const excluded = excludedDocumentRanges(text);
    const rebase = (target: string, wiki: boolean): string => {
      if (!target || target.startsWith("#") || /^[a-z][a-z\d+.-]*:|^\/\//iu.test(target)) return target;
      let decoded: string;
      try { decoded = decodeURI(target); } catch { return target; }
      const hash = decoded.indexOf("#");
      const path = hash < 0 ? decoded : decoded.slice(0, hash);
      const fragment = hash < 0 ? "" : decoded.slice(hash);
      const file = app.metadataCache.getFirstLinkpathDest(path, sourcePath);
      if (!(file instanceof TFile)) return target;
      if (wiki) return file.path + fragment;
      const from = outputPath.split("/").slice(0, -1);
      const to = file.path.split("/");
      while (from.length && to.length && from[0] === to[0]) { from.shift(); to.shift(); }
      const relative = [...from.map(() => ".."), ...to].map(part => encodeURIComponent(part)).join("/");
      return relative + fragment;
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
      const target = angle ? mdTarget.slice(1, -1) : mdTarget;
      const next = rebase(target, false);
      return mdOpen + (angle ? `<${next}>` : next) + mdClose;
    });
  };
}
