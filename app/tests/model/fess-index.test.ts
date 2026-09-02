import {describe, expect, it} from 'vitest';
import {fessIndexInfo, isFessIndex, type FessIndexRole} from '@/model/fess-index';

function index(name: string, aliases: string[] = []) {
  return {name, aliases};
}

/**
 * Every index a fresh Fess 15.8.0 creates on OpenSearch 3.8.0, with the
 * aliases it binds. Read off the running cluster, not inferred.
 */
const REAL_CLUSTER: [string, string[], FessIndexRole][] = [
  ['.plugins-ml-config', [], 'system'],
  ['configsync', [], 'plugin'],
  ['fess.20260902134052541', ['fess.search', 'fess.update'], 'document'],
  ['fess.suggest.20260902134101397', ['fess.suggest', 'fess.suggest.update'], 'suggest'],
  ['fess_config.scheduled_job', ['fess_config', 'fess_basic_config'], 'config'],
  ['fess_config.crawling_info', ['fess_config'], 'config'],
  ['fess_log.search_log', [], 'log'],
  ['fess_log.click_log', [], 'log'],
  ['fess_suggest', [], 'suggest'],
  ['fess_suggest_analyzer', [], 'suggest'],
  ['fess_suggest_array.fess', [], 'suggest'],
  ['fess_user.user', ['fess_user'], 'user'],
  ['fess_user.role', ['fess_user'], 'user'],
];

describe('fessIndexInfo', () => {
  it.each(REAL_CLUSTER)('names %s', (name, aliases, expected) => {
    expect(fessIndexInfo(index(name, aliases)).role).toBe(expected);
  });

  it('marks the live document index with both aliases, search first', () => {
    expect(
      fessIndexInfo(index('fess.20260902134052541', ['fess.update', 'fess.search']))
        .documentAliases,
    ).toEqual(['search', 'update']);
  });

  it('leaves a previous generation with no aliases but still a document', () => {
    // Fess builds the new index, moves the aliases and leaves the old one.
    const info = fessIndexInfo(index('fess.20260101000000000'));
    expect(info.role).toBe('document');
    expect(info.documentAliases).toEqual([]);
  });

  it('reports an index that is only being written to', () => {
    // What a reindex looks like while it runs: search still answers from the
    // old index, updates already go to the new one.
    expect(fessIndexInfo(index('fess.20260902', ['fess.update'])).documentAliases).toEqual([
      'update',
    ]);
  });

  it('does not mistake the suggester for the document index', () => {
    // fess.suggest.<timestamp> starts with `fess.` too.
    expect(fessIndexInfo(index('fess.suggest.20260902134101397')).role).toBe('suggest');
  });

  it('names the crawler indices, which only exist while a crawl runs', () => {
    expect(fessIndexInfo(index('fess_crawler.queue')).role).toBe('crawler');
    expect(fessIndexInfo(index('fess_crawler.data')).role).toBe('crawler');
  });

  it('calls anything else other', () => {
    expect(fessIndexInfo(index('logs-2026.09.02')).role).toBe('other');
    expect(fessIndexInfo(index('top_queries-2026.09.02-04059')).role).toBe('other');
  });
});

describe('isFessIndex', () => {
  it('accepts every index Fess owns', () => {
    const owned = REAL_CLUSTER.filter(([, , r]) => r !== 'system' && r !== 'other');
    owned.forEach(([name, aliases]) => {
      expect(isFessIndex(index(name, aliases))).toBe(true);
    });
    expect(owned).toHaveLength(REAL_CLUSTER.length - 1);
  });

  it('rejects OpenSearch system indices and unrelated ones', () => {
    expect(isFessIndex(index('.plugins-ml-config'))).toBe(false);
    expect(isFessIndex(index('logs-2026.09.02'))).toBe(false);
  });
});
