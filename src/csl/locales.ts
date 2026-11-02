import deDE from "../../resources/csl/locales/locales-de-DE.xml";
import enGB from "../../resources/csl/locales/locales-en-GB.xml";
import enUS from "../../resources/csl/locales/locales-en-US.xml";
import esES from "../../resources/csl/locales/locales-es-ES.xml";
import frFR from "../../resources/csl/locales/locales-fr-FR.xml";
import itIT from "../../resources/csl/locales/locales-it-IT.xml";
import jaJP from "../../resources/csl/locales/locales-ja-JP.xml";
import nlNL from "../../resources/csl/locales/locales-nl-NL.xml";
import plPL from "../../resources/csl/locales/locales-pl-PL.xml";
import ptBR from "../../resources/csl/locales/locales-pt-BR.xml";
import ruRU from "../../resources/csl/locales/locales-ru-RU.xml";
import zhCN from "../../resources/csl/locales/locales-zh-CN.xml";

export interface BundledCslLocale {
  id: string;
  title: string;
  content: string;
}

export const BUNDLED_CSL_LOCALES: readonly BundledCslLocale[] = [
  { id: "de-DE", title: "Deutsch (Deutschland)", content: deDE },
  { id: "en-US", title: "English (United States)", content: enUS },
  { id: "en-GB", title: "English (United Kingdom)", content: enGB },
  { id: "es-ES", title: "Español (España)", content: esES },
  { id: "fr-FR", title: "Français (France)", content: frFR },
  { id: "it-IT", title: "Italiano (Italia)", content: itIT },
  { id: "ja-JP", title: "日本語 (日本)", content: jaJP },
  { id: "nl-NL", title: "Nederlands (Nederland)", content: nlNL },
  { id: "pl-PL", title: "Polski (Polska)", content: plPL },
  { id: "pt-BR", title: "Português (Brasil)", content: ptBR },
  { id: "ru-RU", title: "Русский (Россия)", content: ruRU },
  { id: "zh-CN", title: "简体中文 (中国)", content: zhCN },
];

const LOCALES = new Map(BUNDLED_CSL_LOCALES.map(locale => [locale.id, locale]));

export function getCslLocale(language: string): string {
  return LOCALES.get(language)?.content ?? LOCALES.get("en-US")?.content ?? enUS;
}

export function isSupportedCslLocale(language: string): boolean {
  return LOCALES.has(language);
}

export function cslLocaleTitle(language: string): string {
  return LOCALES.get(language)?.title ?? language;
}

export function supportedCslLocaleIds(): string {
  return BUNDLED_CSL_LOCALES.map(locale => locale.id).join(", ");
}
