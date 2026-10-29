import type { CSL, CSLDate, CSLName, CSLType } from "@citation-js/core";

export const LOCAL_REFERENCE_TYPES = [
  { id: "book", label: "Book" },
  { id: "article-journal", label: "Journal article" },
  { id: "chapter", label: "Book chapter" },
  { id: "paper-conference", label: "Conference paper" },
  { id: "thesis", label: "Thesis" },
  { id: "report", label: "Report" },
  { id: "webpage", label: "Web page" },
  { id: "dataset", label: "Dataset" },
  { id: "software", label: "Software" },
] as const satisfies readonly { id: CSLType; label: string }[];

export interface LocalReferenceInput {
  citeKey: string;
  type: CSLType;
  title: string;
  authors: string;
  editors: string;
  issued: string;
  containerTitle: string;
  publisher: string;
  publisherPlace: string;
  volume: string;
  issue: string;
  pages: string;
  edition: string;
  version: string;
  doi: string;
  url: string;
  accessed: string;
  language: string;
  isbn: string;
}

export const EMPTY_LOCAL_REFERENCE: LocalReferenceInput = {
  citeKey: "",
  type: "article-journal",
  title: "",
  authors: "",
  editors: "",
  issued: "",
  containerTitle: "",
  publisher: "",
  publisherPlace: "",
  volume: "",
  issue: "",
  pages: "",
  edition: "",
  version: "",
  doi: "",
  url: "",
  accessed: "",
  language: "",
  isbn: "",
};

const MANAGED_FIELDS = [
  "type", "id", "citation-key", "title", "author", "editor", "issued",
  "container-title", "publisher", "publisher-place", "volume", "issue",
  "page", "edition", "version", "DOI", "URL", "accessed", "language", "ISBN",
] as const;

export function parseLocalLibrary(content: string, path: string): CSL[] {
  if (content.trim() === "") return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(`Invalid JSON in ${path}: ${errorMessage(error)}`);
  }
  const records = Array.isArray(parsed) ? parsed : [parsed];
  const validated = records.map((record, index) => validateRecord(record, index, path));
  const seen = new Set<string>();
  for (const record of validated) {
    const citeKey = readCiteKey(record);
    if (seen.has(citeKey)) throw new Error(`Duplicate citekey in ${path}: ${citeKey}`);
    seen.add(citeKey);
  }
  return validated;
}

export function serializeLocalLibrary(records: readonly CSL[]): string {
  return `${JSON.stringify(records, undefined, 2)}\n`;
}

export function localReferenceInput(record: CSL): LocalReferenceInput {
  return {
    citeKey: readCiteKey(record),
    type: record.type,
    title: text(record.title),
    authors: formatNames(record.author),
    editors: formatNames(record.editor),
    issued: formatDate(record.issued),
    containerTitle: text(record["container-title"]),
    publisher: text(record.publisher),
    publisherPlace: text(record["publisher-place"]),
    volume: text(record.volume),
    issue: text(record.issue),
    pages: text(record.page),
    edition: text(record.edition),
    version: text(record.version),
    doi: text(record.DOI),
    url: text(record.URL),
    accessed: formatDate(record.accessed),
    language: text(record.language),
    isbn: text(record.ISBN),
  };
}

export function generateLocalCiteKey(
  input: Pick<LocalReferenceInput, "authors" | "issued" | "title">,
  occupiedCiteKeys: Iterable<string> = [],
): string {
  const author = input.authors.split(/\r?\n|;/u).map(value => value.trim()).find(Boolean) ?? "";
  const familyOrOrganisation = author.includes(",") ? author.slice(0, author.indexOf(",")) : author;
  const authorPart = slug(familyOrOrganisation).split("-").slice(0, 2).join("-");
  const yearPart = /^(\d{4})/u.exec(input.issued.trim())?.[1] ?? "";
  const titlePart = slug(input.title).split("-").filter(part => !CITEKEY_STOP_WORDS.has(part)).slice(0, 3).join("-");
  const base = [authorPart, yearPart, titlePart].filter(Boolean).join("-").slice(0, 72) || "reference";
  const occupied = new Set([...occupiedCiteKeys].map(value => value.toLowerCase()));
  if (!occupied.has(base.toLowerCase())) return base;
  let suffix = 2;
  while (occupied.has(`${base}-${suffix}`.toLowerCase())) suffix += 1;
  return `${base}-${suffix}`;
}

export function buildLocalReference(
  input: LocalReferenceInput,
  previous?: CSL,
): CSL {
  const citeKey = validateCiteKey(input.citeKey);
  const title = input.title.trim();
  if (!title) throw new Error("Title is required.");
  if (!input.type) throw new Error("Choose a reference type.");

  const record = { ...(previous ?? {}) } as Record<string, unknown>;
  for (const field of MANAGED_FIELDS) delete record[field];
  record.type = input.type;
  record.id = citeKey;
  record["citation-key"] = citeKey;
  record.title = title;
  assign(record, "author", parseNames(input.authors));
  assign(record, "editor", parseNames(input.editors));
  assign(record, "issued", parseDate(input.issued, "Publication date"));
  assignText(record, "container-title", input.containerTitle);
  assignText(record, "publisher", input.publisher);
  assignText(record, "publisher-place", input.publisherPlace);
  assignText(record, "volume", input.volume);
  assignText(record, "issue", input.issue);
  assignText(record, "page", input.pages);
  assignText(record, "edition", input.edition);
  assignText(record, "version", input.version);
  assignText(record, "DOI", normalizeDoi(input.doi));
  assignText(record, "URL", input.url);
  assign(record, "accessed", parseDate(input.accessed, "Accessed date"));
  assignText(record, "language", input.language);
  assignText(record, "ISBN", input.isbn);
  return record as CSL;
}

export function upsertLocalReference(
  records: readonly CSL[],
  input: LocalReferenceInput,
  originalCiteKey?: string,
): CSL[] {
  const citeKey = validateCiteKey(input.citeKey);
  const originalIndex = originalCiteKey === undefined
    ? -1
    : records.findIndex(record => readCiteKey(record) === originalCiteKey);
  if (originalCiteKey !== undefined && originalIndex < 0) {
    throw new Error(`Reference no longer exists: ${originalCiteKey}`);
  }
  const duplicate = records.findIndex((record, index) => readCiteKey(record) === citeKey && index !== originalIndex);
  if (duplicate >= 0) throw new Error(`Citekey already exists in the local library: ${citeKey}`);

  const updated = buildLocalReference(input, originalIndex >= 0 ? records[originalIndex] : undefined);
  if (originalIndex < 0) return [...records, updated];
  return records.map((record, index) => index === originalIndex ? updated : record);
}

export function removeLocalReference(records: readonly CSL[], citeKey: string): CSL[] {
  const index = records.findIndex(record => readCiteKey(record) === citeKey);
  if (index < 0) throw new Error(`Reference no longer exists: ${citeKey}`);
  return records.filter((_record, recordIndex) => recordIndex !== index);
}

export function readCiteKey(record: CSL): string {
  const key = typeof record["citation-key"] === "string" && record["citation-key"].trim()
    ? record["citation-key"]
    : String(record.id ?? "");
  return validateCiteKey(key);
}

function validateRecord(value: unknown, index: number, path: string): CSL {
  if (!isRecord(value)) throw new Error(`Entry ${index + 1} in ${path} is not an object.`);
  if (typeof value.type !== "string" || !value.type) throw new Error(`Entry ${index + 1} in ${path} has no type.`);
  readCiteKey(value as CSL);
  return value as CSL;
}

function validateCiteKey(value: string): string {
  const citeKey = value.trim();
  if (!citeKey) throw new Error("Citekey is required.");
  if (/\s|["'<>]/u.test(citeKey) || [...citeKey].some(character => character.charCodeAt(0) < 32)) {
    throw new Error("Citekey may not contain spaces, quotes, angle brackets, or control characters.");
  }
  return citeKey;
}

function parseNames(value: string): CSLName[] | undefined {
  const names = value.split(/\r?\n|;/u).map(line => line.trim()).filter(Boolean).map(line => {
    const comma = line.indexOf(",");
    if (comma < 0) return { literal: line };
    const family = line.slice(0, comma).trim();
    const given = line.slice(comma + 1).trim();
    if (!family) throw new Error(`Invalid name: ${line}`);
    return { family, ...(given ? { given } : {}) };
  });
  return names.length ? names : undefined;
}

function formatNames(names: CSLName[] | undefined): string {
  return (names ?? []).map(name => name.literal ?? [name.family, name.given].filter(Boolean).join(", ")).join("\n");
}

function parseDate(value: string, label: string): CSLDate | undefined {
  const date = value.trim();
  if (!date) return undefined;
  const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/u.exec(date);
  if (!match) throw new Error(`${label} must be YYYY, YYYY-MM, or YYYY-MM-DD.`);
  const year = Number(match[1]);
  const month = match[2] ? Number(match[2]) : undefined;
  const day = match[3] ? Number(match[3]) : undefined;
  if (month !== undefined && (month < 1 || month > 12)) throw new Error(`${label} has an invalid month.`);
  if (day !== undefined) {
    const maximum = new Date(Date.UTC(year, month ?? 1, 0)).getUTCDate();
    if (day < 1 || day > maximum) throw new Error(`${label} has an invalid day.`);
  }
  const parts: [number] | [number, number] | [number, number, number] = day !== undefined
    ? [year, month as number, day]
    : month !== undefined ? [year, month] : [year];
  return { "date-parts": [parts] };
}

function formatDate(date: CSLDate | undefined): string {
  const parts = date?.["date-parts"]?.[0];
  if (!parts?.length) return typeof date?.literal === "string" ? date.literal : "";
  return parts.map((part, index) => index === 0 ? String(part) : String(part).padStart(2, "0")).join("-");
}

function normalizeDoi(value: string): string {
  return value.trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//iu, "").replace(/^doi:\s*/iu, "");
}

const CITEKEY_STOP_WORDS = new Set([
  "a", "an", "and", "der", "die", "das", "ein", "eine", "einer", "of", "the", "und", "von", "zu",
]);

function slug(value: string): string {
  return value
    .trim()
    .replace(/ä/giu, "ae")
    .replace(/ö/giu, "oe")
    .replace(/ü/giu, "ue")
    .replace(/ß/gu, "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

function assign(record: Record<string, unknown>, key: string, value: unknown): void {
  if (value !== undefined) record[key] = value;
}

function assignText(record: Record<string, unknown>, key: string, value: string): void {
  const normalized = value.trim();
  if (normalized) record[key] = normalized;
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
