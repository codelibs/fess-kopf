import {readonly, ref, shallowRef} from 'vue';
import en from './messages/en.json';
import {FALLBACK, resolveLocale, type SupportedLocale} from './locale';

/**
 * en.json is both the fallback for a key a translator has not reached yet and
 * the definition of the key set, so a mistyped key is a compile error rather
 * than a string that renders as itself.
 */
export type MessageKey = keyof typeof en;

type Catalogue = Partial<Record<MessageKey, string>>;

/** Fess appends this to the dashboard iframe's URL. */
const PARAM = 'lang';

/**
 * The other fifteen catalogues, one chunk each, fetched only when asked for.
 * English is imported statically because it is needed on every page view.
 */
const CATALOGUES = import.meta.glob<{default: Catalogue}>([
  './messages/*.json',
  // Excluded because it is already in the main bundle; without this Vite
  // emits a second, never-fetched copy of it as a chunk.
  '!./messages/en.json',
]);

const active = ref<SupportedLocale>(FALLBACK);
const messages = shallowRef<Catalogue>(en);

/** The locale in use. Read-only: Fess decides it, kopf does not. */
export const locale = readonly(active);

/**
 * The language Fess resolved for the dashboard request. Absent when kopf is
 * served by anything else -- `vite dev`, a plain static server, or a Fess
 * predating the hand-off.
 */
export function languageFromUrl(): string | null {
  const value = new URLSearchParams(window.location.search).get(PARAM);
  return value === null || value.trim() === '' ? null : value;
}

/**
 * What Fess said, else what the browser prefers. The two usually agree, since
 * Fess derives its own admin locale from Accept-Language; they part company
 * when the console was opened with ?browser_lang=.
 */
export function preferredLanguage(): string | null {
  return languageFromUrl() ?? (navigator.language === '' ? null : navigator.language);
}

/**
 * Resolves and installs a catalogue. Never rejects: a chunk that fails to load
 * leaves English in place, which is a usable screen, and an alert about a
 * missing translation is noise during an incident.
 */
export async function loadLocale(requested: string | null): Promise<SupportedLocale> {
  const resolved = resolveLocale(requested);
  if (resolved === FALLBACK) {
    messages.value = en;
    active.value = FALLBACK;
    return FALLBACK;
  }
  const load = CATALOGUES[`./messages/${resolved}.json`];
  if (load === undefined) {
    return FALLBACK;
  }
  try {
    messages.value = (await load()).default;
    active.value = resolved;
    return resolved;
  } catch {
    messages.value = en;
    active.value = FALLBACK;
    return FALLBACK;
  }
}

/**
 * Looks a message up, substituting {placeholder} tokens. A key the active
 * catalogue has not translated falls back to English, so a partial catalogue
 * degrades one string at a time rather than emptying a screen.
 */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const template = messages.value[key] ?? en[key];
  if (params === undefined) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (token, name: string) =>
    Object.hasOwn(params, name) ? String(params[name]) : token,
  );
}

/**
 * Test seam: puts the module back to the English it boots with, or installs
 * a deliberately incomplete catalogue to exercise the per-key fallback that
 * no shipped catalogue can reach.
 */
export function resetI18nForTest(catalogue?: Catalogue): void {
  messages.value = catalogue ?? en;
  active.value = FALLBACK;
}
