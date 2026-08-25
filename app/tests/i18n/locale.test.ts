import {describe, expect, it} from 'vitest';
import {FALLBACK, resolveLocale, SUPPORTED} from '@/i18n/locale';

/**
 * The rows below are the same fallbacks java.util.ResourceBundle performs over
 * Fess's fess_label_*.properties. They are asserted here because kopf renders
 * inside the admin console's iframe: any row where the two disagree shows a
 * page in two languages at once.
 */
describe('resolveLocale', () => {
  it.each([
    ['ja', 'ja'],
    ['ja-JP', 'ja'],
    ['ja_JP', 'ja'],
    ['JA', 'ja'],
    ['en', 'en'],
    ['en-US', 'en'],
    ['de-AT', 'de'],
    ['pt-BR', 'pt-BR'],
    ['pt_BR', 'pt-BR'],
    ['pt-br', 'pt-BR'],
    ['zh-CN', 'zh-CN'],
    ['zh-TW', 'zh-TW'],
  ])('resolves %s to %s', (requested, expected) => {
    expect(resolveLocale(requested)).toBe(expected);
  });

  it.each([
    // Fess has no fess_label_pt.properties, so `pt` alone is English there.
    ['pt'],
    // Nor fess_label_zh.properties: the two Chinese bundles are country-tagged.
    ['zh'],
    ['zh-Hans-CN'],
    // A language Fess does not ship at all.
    ['sv'],
    ['sv-SE'],
  ])('falls back to English for %s, exactly as Fess does', (requested) => {
    expect(resolveLocale(requested)).toBe(FALLBACK);
  });

  it.each([[null], [undefined], [''], ['   '], ['-'], ['!!'], ['x'.repeat(200)]])(
    'falls back to English for %s rather than throwing',
    (requested) => {
      expect(resolveLocale(requested)).toBe(FALLBACK);
    },
  );

  it('resolves every supported tag to itself', () => {
    for (const tag of SUPPORTED) {
      expect(resolveLocale(tag)).toBe(tag);
    }
  });

  it('lists English among the supported locales, since it is the fallback', () => {
    expect(SUPPORTED).toContain(FALLBACK);
  });
});
