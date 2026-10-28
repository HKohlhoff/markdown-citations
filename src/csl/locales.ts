import deDE from "../../resources/csl/locales/locales-de-DE.xml";
import enGB from "../../resources/csl/locales/locales-en-GB.xml";
import enUS from "../../resources/csl/locales/locales-en-US.xml";

const LOCALES: Readonly<Record<string, string>> = {
  "de-DE": deDE,
  "en-GB": enGB,
  "en-US": enUS,
};

export function getCslLocale(language: string): string {
  return LOCALES[language] ?? LOCALES["en-US"] ?? enUS;
}
