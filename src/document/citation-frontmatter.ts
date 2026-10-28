import type { CitationRenderOptions } from "../citation/render";

export interface StoredCitation extends CitationRenderOptions {
  citeKey: string;
}

export interface CitationState {
  version: 1;
  // Preserve user values even while overrides are disabled; validation is opt-in.
  style?: unknown;
  locale?: unknown;
  publication?: { source: string };
  citations: Record<string, StoredCitation>;
  master?: MasterCitationIndex;
}

export interface MasterCitationRecord extends StoredCitation {
  sourcePath: string;
  citationId: string;
  occurrences: number;
}

export interface MasterCitationIndex {
  style: string;
  locale: string;
  documents: string[];
  citations: MasterCitationRecord[];
}

export interface YamlCodec {
  parse(source: string): unknown;
  stringify(value: unknown): string;
}

const KEY = "markdown-citations";

export function frontmatterRange(content: string): { start: number; end: number; bodyStart: number; yaml: string } | undefined {
  const opening = content.match(/^(?:\uFEFF)?---\r?\n/u);
  if (!opening) return undefined;
  const closing = /^(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/gmu;
  closing.lastIndex = opening[0].length;
  const end = closing.exec(content);
  if (!end) throw new Error("The note has an unclosed YAML frontmatter block.");
  return { start: opening[0].length, end: end.index, bodyStart: end.index + end[0].length, yaml: content.slice(opening[0].length, end.index) };
}

export function readCitationState(content: string, codec: YamlCodec): CitationState {
  const range = frontmatterRange(content);
  if (!range) return { version: 1, citations: {} };
  const root = codec.parse(range.yaml);
  if (root !== null && root !== undefined && !isRecord(root)) throw new Error("Frontmatter must be a YAML mapping.");
  const state: unknown = root?.[KEY] === undefined ? {} : root[KEY];
  if (!isRecord(state) || (state.version !== undefined && state.version !== 1)
    || (state.citations !== undefined && !isRecord(state.citations))) {
    throw new Error("The markdown-citations frontmatter has an unsupported format.");
  }
  const citations: Record<string, StoredCitation> = {};
  for (const [id, value] of Object.entries(state.citations ?? {})) {
    if (!/^c[a-z0-9]+$/u.test(id)) throw new Error("Invalid citation identifier in frontmatter.");
    citations[id] = validateStoredCitation(value);
  }
  const result: CitationState = { version: 1, citations };
  for (const [field, legacy] of [["style", "mc-style"], ["locale", "mc-locale"]] as const) {
    if (Object.prototype.hasOwnProperty.call(state, field)) result[field] = state[field];
    else if (root && Object.prototype.hasOwnProperty.call(root, legacy)) result[field] = root[legacy];
  }
  if (state.master !== undefined) result.master = validateMasterIndex(state.master);
  if (state.publication !== undefined) {
    if (!isRecord(state.publication) || typeof state.publication.source !== "string" || !state.publication.source) throw new Error("Invalid publication ownership data.");
    result.publication = { source: state.publication.source };
  }
  return result;
}

function validateMasterIndex(value: unknown): MasterCitationIndex {
  if (!isRecord(value) || typeof value.style !== "string" || typeof value.locale !== "string"
    || !Array.isArray(value.documents) || !value.documents.every(path => typeof path === "string")
    || !Array.isArray(value.citations)) throw new Error("Unsupported master citation index.");
  const citations = value.citations.map((record: unknown): MasterCitationRecord => {
    if (!isRecord(record) || typeof record.sourcePath !== "string" || typeof record.citationId !== "string"
      || typeof record.occurrences !== "number" || !Number.isInteger(record.occurrences) || record.occurrences < 1) {
      throw new Error("Invalid master citation record.");
    }
    return { ...validateStoredCitation(record), sourcePath: record.sourcePath, citationId: record.citationId, occurrences: record.occurrences };
  });
  return { style: value.style, locale: value.locale, documents: value.documents, citations };
}

export function writeCitationState(content: string, state: CitationState, codec: YamlCodec): string {
  const range = frontmatterRange(content);
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const block = codec.stringify({ [KEY]: state }).trimEnd().replace(/\r?\n/gu, newline) + newline;
  if (!range) {
    const bom = content.startsWith("\uFEFF") ? "\uFEFF" : "";
    return `${bom}---${newline}${block}---${newline}${content.slice(bom.length)}`;
  }
  if (/^\s*[{[]/u.test(range.yaml)) {
    throw new Error("Convert flow-style frontmatter to a YAML block before updating citations.");
  }
  const ownField = /^(?:markdown-citations|"markdown-citations"|'markdown-citations'):[^\r\n]*(?:\r?\n(?:[ \t]+[^\r\n]*|[ \t]*(?=\r?$)))*/gmu;
  const matches = [...range.yaml.matchAll(ownField)];
  if (matches.length > 1) throw new Error("Duplicate markdown-citations frontmatter fields.");
  const match = matches[0];
  let yaml = match
    ? range.yaml.slice(0, match.index) + block + range.yaml.slice(match.index + match[0].length).replace(/^\r?\n/u, "")
    : range.yaml + (range.yaml && !range.yaml.endsWith("\n") ? newline : "") + block;
  // Old top-level prototype properties migrate into the shared namespace.
  for (const [field, legacy] of [["style", "mc-style"], ["locale", "mc-locale"]] as const) {
    if (Object.prototype.hasOwnProperty.call(state, field)) yaml = yaml.replace(new RegExp(`^(?:${legacy}|"${legacy}"|'${legacy}'):[^\\r\\n]*(?:\\r?\\n|$)`, "gmu"), "");
  }
  // Validate before replacing any editor content.
  codec.parse(yaml);
  return content.slice(0, range.start) + yaml + content.slice(range.end);
}

export function validateStoredCitation(value: unknown): StoredCitation {
  if (!isRecord(value) || typeof value.citeKey !== "string" || !value.citeKey.trim()) {
    throw new Error("Citation data has no valid citekey.");
  }
  const result: StoredCitation = { citeKey: value.citeKey };
  if (value.form !== undefined) {
    if (value.form !== "parenthetical" && value.form !== "narrative") throw new Error("Invalid citation form.");
    result.form = value.form;
  }
  const types = ["page", "pages", "chapter", "section", "paragraph", "figure", "table", "line"];
  if (value.locatorType !== undefined) {
    if (typeof value.locatorType !== "string" || !types.includes(value.locatorType)) throw new Error("Invalid locator type.");
    result.locatorType = value.locatorType as StoredCitation["locatorType"];
  }
  for (const field of ["locator", "prefix", "suffix"] as const) {
    if (value[field] !== undefined && typeof value[field] !== "string") throw new Error(`Invalid citation ${field}.`);
    if (typeof value[field] === "string" && value[field]) result[field] = value[field];
  }
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
