import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import ja from '@/i18n/messages/ja.json';
import {
  languageFromUrl,
  loadLocale,
  locale,
  preferredLanguage,
  resetI18nForTest,
  t,
} from '@/i18n';

function at(href: string): void {
  window.history.replaceState({}, '', href);
}

beforeEach(() => resetI18nForTest());

afterEach(() => {
  at('/');
  vi.unstubAllGlobals();
  resetI18nForTest();
});

describe('languageFromUrl', () => {
  it('reads the parameter Fess puts on the iframe URL', () => {
    at('/admin/server_abc/_plugin/kopf/?lang=ja');
    expect(languageFromUrl()).toBe('ja');
  });

  it('survives the hash route, which is where the app spends its life', () => {
    at('/admin/server_abc/_plugin/kopf/?lang=pt-BR#/nodes');
    expect(languageFromUrl()).toBe('pt-BR');
  });

  it('is null when kopf is served by something other than Fess', () => {
    at('/admin/server_abc/_plugin/kopf/');
    expect(languageFromUrl()).toBeNull();
  });

  it('treats an empty parameter as absent', () => {
    at('/admin/server_abc/_plugin/kopf/?lang=');
    expect(languageFromUrl()).toBeNull();
  });
});

describe('preferredLanguage', () => {
  it('prefers what Fess resolved over what the browser prefers', () => {
    // The case that justifies the hand-off: an admin who opened the console
    // with ?browser_lang=de sees German around an iframe the browser would
    // have rendered in English.
    vi.stubGlobal('navigator', {language: 'en-US'});
    at('/admin/server_abc/_plugin/kopf/?lang=de');
    expect(preferredLanguage()).toBe('de');
  });

  it('falls back to the browser when Fess passed nothing', () => {
    vi.stubGlobal('navigator', {language: 'fr-FR'});
    at('/admin/server_abc/_plugin/kopf/');
    expect(preferredLanguage()).toBe('fr-FR');
  });

  it('is null when the browser reports no language either', () => {
    vi.stubGlobal('navigator', {language: ''});
    at('/');
    expect(preferredLanguage()).toBeNull();
  });
});

describe('t', () => {
  it('returns English before any catalogue is loaded', () => {
    expect(t('common.save')).toBe('save');
  });

  it('substitutes named placeholders', () => {
    expect(t('createIndex.created', {index: 'fess.2026'})).toBe('Index fess.2026 was created');
  });

  it('substitutes a placeholder that appears with a number', () => {
    expect(t('snapshot.indexCount', {count: 3})).toBe('3 indices');
  });

  it('leaves a placeholder alone when no value is supplied for it', () => {
    expect(t('createIndex.created', {other: 'x'})).toBe('Index {index} was created');
  });

  it('leaves the literal {} in the create-index hint untouched', () => {
    expect(t('createIndex.bodyHint')).toContain('{}');
  });
});

describe('loadLocale', () => {
  it('installs the catalogue for a supported tag', async () => {
    await expect(loadLocale('ja')).resolves.toBe('ja');
    expect(locale.value).toBe('ja');
    expect(t('common.save')).toBe(ja['common.save']);
  });

  it('resolves a country tag to its language catalogue', async () => {
    await expect(loadLocale('ja-JP')).resolves.toBe('ja');
    expect(t('common.save')).toBe(ja['common.save']);
  });

  it('keeps English for a tag Fess has no bundle for', async () => {
    await expect(loadLocale('zh')).resolves.toBe('en');
    expect(t('common.save')).toBe('save');
  });

  it('keeps English when nothing was requested', async () => {
    await expect(loadLocale(null)).resolves.toBe('en');
    expect(locale.value).toBe('en');
  });

  it('puts English back when a second load resolves to English', async () => {
    await loadLocale('ja');
    expect(t('common.save')).toBe(ja['common.save']);
    await loadLocale('sv');
    expect(t('common.save')).toBe('save');
  });

  it('falls back to English for a key the active catalogue lacks', () => {
    // A catalogue that is one translation short keeps the screen rendering,
    // that single string in English, rather than showing a raw key. No
    // shipped catalogue can reach this -- messages.test.ts forbids it -- so
    // the incomplete catalogue is installed directly.
    const incomplete = {...ja} as Record<string, string>;
    delete incomplete['common.save'];
    resetI18nForTest(incomplete);
    expect(t('common.save')).toBe('save');
    expect(t('common.delete')).toBe(ja['common.delete']);
  });
});
