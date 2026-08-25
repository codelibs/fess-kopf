/**
 * Which catalogue answers for a requested language tag.
 *
 * Fess resolves its own admin labels through java.util.ResourceBundle over
 * fess_label_<locale>.properties, so `zh` on its own lands on the English
 * default while `zh-CN` finds a bundle. Reproducing that fallback here is
 * deliberate: kopf renders inside the admin console's iframe, and a page whose
 * frame speaks English while its contents speak Chinese is worse than either
 * language alone.
 */

/** Exactly the locales Fess ships a fess_label bundle for. */
export const SUPPORTED = [
  'de',
  'en',
  'es',
  'fr',
  'hi',
  'id',
  'it',
  'ja',
  'ko',
  'nl',
  'pl',
  'pt-BR',
  'ru',
  'tr',
  'zh-CN',
  'zh-TW',
] as const;

export type SupportedLocale = (typeof SUPPORTED)[number];

/** What every unmatched request falls back to, as it does in Fess. */
export const FALLBACK: SupportedLocale = 'en';

const BY_LOWER = new Map<string, SupportedLocale>(SUPPORTED.map((tag) => [tag.toLowerCase(), tag]));

/**
 * Java writes `pt_BR` and BCP 47 writes `pt-BR`; browsers vary the case. All
 * three name the same request.
 */
function normalise(tag: string): string {
  return tag.trim().replace(/_/g, '-').toLowerCase();
}

/**
 * Exact tag, then the language on its own, then English -- the order
 * ResourceBundle uses, which is what keeps kopf and the admin console around
 * it on the same language.
 */
export function resolveLocale(requested: string | null | undefined): SupportedLocale {
  if (requested === null || requested === undefined) {
    return FALLBACK;
  }
  const tag = normalise(requested);
  if (tag === '') {
    return FALLBACK;
  }
  const exact = BY_LOWER.get(tag);
  if (exact !== undefined) {
    return exact;
  }
  // `zh-Hans-CN` reduces to `zh`, which Fess has no bundle for either.
  return BY_LOWER.get(tag.split('-')[0] ?? '') ?? FALLBACK;
}
