import {describe, expect, it} from 'vitest';
import en from '@/i18n/messages/en.json';
import {SUPPORTED} from '@/i18n/locale';

/**
 * Fifteen of the sixteen catalogues are authored without a native reviewer, so
 * the one thing that must not be left to inspection is whether a key was
 * missed. A forgotten translation has to be a failing test, not a string that
 * silently renders in English.
 */
const CATALOGUES = import.meta.glob<{default: Record<string, string>}>('@/i18n/messages/*.json', {
  eager: true,
});

function catalogueFor(tag: string): Record<string, string> {
  const entry = Object.entries(CATALOGUES).find(([path]) => path.endsWith(`/${tag}.json`));
  if (entry === undefined) {
    throw new Error(`no catalogue file for ${tag}`);
  }
  return entry[1].default;
}

/** The tokens t() will substitute, in a stable order. */
function placeholders(message: string): string[] {
  return [...message.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

const KEYS = Object.keys(en);

describe('message catalogues', () => {
  it('ships one file per supported locale, and no others', () => {
    const shipped = Object.keys(CATALOGUES)
      .map((path) => path.replace(/^.*\//, '').replace(/\.json$/, ''))
      .sort();
    expect(shipped).toEqual([...SUPPORTED].sort());
  });

  it.each(SUPPORTED)('%s has exactly the keys of en.json', (tag) => {
    expect(Object.keys(catalogueFor(tag)).sort()).toEqual([...KEYS].sort());
  });

  it.each(SUPPORTED)('%s substitutes the same placeholders as en.json', (tag) => {
    const catalogue = catalogueFor(tag);
    const differing = KEYS.filter(
      (key) => placeholders(en[key]) .join() !== placeholders(catalogue[key] ?? '').join(),
    );
    expect(differing).toEqual([]);
  });

  it.each(SUPPORTED)('%s translates no message to an empty string', (tag) => {
    const catalogue = catalogueFor(tag);
    expect(KEYS.filter((key) => catalogue[key].trim() === '')).toEqual([]);
  });

  it.each(SUPPORTED)('%s keeps the literal {} in the create-index hint', (tag) => {
    // Not a placeholder: it is the empty JSON document the editor starts with,
    // and a translator who "fixes" it breaks the sentence's only instruction.
    expect(catalogueFor(tag)['createIndex.bodyHint']).toContain('{}');
  });
});
