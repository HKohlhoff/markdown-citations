import { normalizeSettings, type MarkdownCitationsSettings } from "./settings-data";

export const CURRENT_SCHEMA_VERSION = 3;

export interface MarkdownCitationsData {
  schemaVersion: number;
  settings: MarkdownCitationsSettings;
  lastReadUpdateVersion: string;
}

export function normalizePluginData(value: unknown): MarkdownCitationsData {
  const candidate = isRecord(value) ? value : {};
  const settingsSource = isRecord(candidate.settings) ? candidate.settings : candidate;
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    settings: normalizeSettings(settingsSource),
    lastReadUpdateVersion: typeof candidate.lastReadUpdateVersion === "string" ? candidate.lastReadUpdateVersion : "",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
