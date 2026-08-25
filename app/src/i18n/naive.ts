import {
  deDE,
  enUS,
  esES,
  frFR,
  hiIN,
  idID,
  itIT,
  jaJP,
  koKR,
  type NLocale,
  nlNL,
  plPL,
  ptBR,
  ruRU,
  trTR,
  zhCN,
  zhTW,
} from 'naive-ui';
import type {SupportedLocale} from './locale';

/**
 * Naive UI carries its own strings -- the "Please Input" placeholder, a
 * select's empty state, the pagination labels -- and none of them are in
 * kopf's catalogue. Left alone they put English inside an otherwise
 * translated form, so the two locales move together.
 *
 * Every locale Fess ships a bundle for has a counterpart here, which is why
 * this is a total map rather than a lookup with a fallback.
 */
export const NAIVE_LOCALES: Record<SupportedLocale, NLocale> = {
  de: deDE,
  en: enUS,
  es: esES,
  fr: frFR,
  hi: hiIN,
  id: idID,
  it: itIT,
  ja: jaJP,
  ko: koKR,
  nl: nlNL,
  pl: plPL,
  'pt-BR': ptBR,
  ru: ruRU,
  tr: trTR,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
};
