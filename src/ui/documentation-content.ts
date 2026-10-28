import readme from "../../README.md";
import lastUpdate from "../../Last Update.md";

export const README_MARKDOWN = readme;
export const LAST_UPDATE_MARKDOWN = lastUpdate;
export const REPOSITORY_URL = "https://github.com/HKohlhoff/markdown-citations";

export function prepareReadmeMarkdown(markdown: string, repositoryUrl = REPOSITORY_URL): string {
  return markdown
    .replace(/<a\b([^>]*)>\s*<img\b[^>]*>\s*<\/a>/giu, (_match, attributes: string) => {
      const href = attributes.match(/\bhref\s*=\s*(["'])(.*?)\1/iu)?.[2];
      return href && /^https:\/\/(?:www\.)?ko-fi\.com(?:\/|$)/iu.test(href)
        ? `[Support this plugin on Ko-fi](${href})` : "";
    })
    .replace(/<img\b[^>]*>/giu, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/gu, "")
    .replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/gu, (match, label: string, target: string) => {
      if (/^(?:[a-z][a-z\d+.-]*:|#|\/)/iu.test(target)) return match;
      const path = target.replace(/^\.\//u, "");
      return `[${label}](${repositoryUrl.replace(/\/+$/u, "")}/${path.endsWith("/") ? "tree" : "blob"}/develop/${path})`;
    })
    .replace(/\n(?:[ \t]*\n){2,}/gu, "\n\n")
    .trim() + "\n";
}
