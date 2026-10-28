import { normalizeSettings, type MarkdownCitationsSettings } from "../settings-data";
import { frontmatterRange, type YamlCodec } from "./citation-frontmatter";

/** User choices share the plugin namespace with its managed citation registry. */
export function resolveNoteSettings(
  global: MarkdownCitationsSettings, content: string, codec: YamlCodec,
): MarkdownCitationsSettings {
  const effective = { ...global, bibliographyPaths: [...global.bibliographyPaths] };
  if (!global.allowFrontmatterOverrides) return effective;
  const values = readNoteFormatProperties(content, codec);
  const configured = (name: string): boolean => values[name] !== undefined && values[name] !== null;
  const text = (name: string): string | undefined => {
    if (!configured(name)) return undefined;
    const value = values[name];
    if (typeof value !== "string" || /[\r\n]/u.test(value)) throw new Error(`${name} must be a single-line text value.`);
    return value.trim() || undefined;
  };

  const style = text("style");
  if (style) effective.defaultCitationStyle = normalizeSettings({ defaultCitationStyle: style }).defaultCitationStyle;
  const locale = text("locale");
  if (locale) {
    if (!["de-DE", "en-US", "en-GB"].includes(locale)) throw new Error("markdown-citations.locale must be de-DE, en-US, or en-GB.");
    effective.defaultLocale = locale;
  }
  return effective;
}

export function readNoteFormatProperties(content: string, codec: YamlCodec): Record<string, unknown> {
  const range = frontmatterRange(content);
  if (!range) return {};
  const parsed = codec.parse(range.yaml);
  if (parsed === null || parsed === undefined) return {};
  if (typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Frontmatter must be a YAML mapping.");
  const root = parsed as Record<string, unknown>;
  const group = root["markdown-citations"];
  if (group !== undefined && (group === null || typeof group !== "object" || Array.isArray(group))) throw new Error("markdown-citations must be a YAML mapping.");
  return { style: root["mc-style"], locale: root["mc-locale"], ...(group as Record<string, unknown> | undefined) };
}
