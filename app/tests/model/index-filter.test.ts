import {describe, expect, it} from 'vitest';
import {IndexFilter, type FilterableIndex} from '@/model/index-filter';

/** Ported from tests/models/index-filter.test.js. */

function index(name: string, overrides: Partial<FilterableIndex> = {}): FilterableIndex {
  return {name, aliases: [], special: false, closed: false, unhealthy: false, ...overrides};
}

/** The screen's default: show everything, ascending. */
const showAll = () => new IndexFilter('', true, true, true, true);

describe('IndexFilter', () => {
  it('keeps every constructor argument', () => {
    const filter = new IndexFilter('idx', false, true, false, true, 7);
    expect(filter.name).toBe('idx');
    expect(filter.closed).toBe(false);
    expect(filter.special).toBe(true);
    expect(filter.healthy).toBe(false);
    expect(filter.asc).toBe(true);
    expect(filter.timestamp).toBe(7);
    expect(filter.sort).toBe('name');
  });

  describe('name matching', () => {
    it('matches an exact and a partial name', () => {
      expect(new IndexFilter('fess.search', true, true, true, true).matches(index('fess.search')))
        .toBe(true);
      expect(new IndexFilter('search', true, true, true, true).matches(index('fess.search')))
        .toBe(true);
    });

    it('treats the filter as a regular expression', () => {
      expect(new IndexFilter('^fess\\..*$', true, true, true, true).matches(index('fess.search')))
        .toBe(true);
      expect(new IndexFilter('^other', true, true, true, true).matches(index('fess.search')))
        .toBe(false);
    });

    it('matches case-insensitively', () => {
      expect(new IndexFilter('FESS', true, true, true, true).matches(index('fess.search')))
        .toBe(true);
    });

    it('matches an alias too', () => {
      const idx = index('fess.20260101', {aliases: ['fess.search']});
      expect(new IndexFilter('fess.search', true, true, true, true).matches(idx)).toBe(true);
      expect(new IndexFilter('^fess\\.sea', true, true, true, true).matches(idx)).toBe(true);
    });

    it('falls back to substring matching when the pattern is invalid', () => {
      // '[' alone throws in the RegExp constructor.
      const filter = new IndexFilter('[', true, true, true, true);
      expect(filter.matches(index('weird[name'))).toBe(true);
      expect(filter.matches(index('normal'))).toBe(false);
    });
  });

  describe('type toggles', () => {
    it('excludes special indices when special is off', () => {
      const filter = new IndexFilter('', true, false, true, true);
      expect(filter.matches(index('.kibana', {special: true}))).toBe(false);
      expect(filter.matches(index('fess.search'))).toBe(true);
    });

    it('excludes closed indices when closed is off', () => {
      const filter = new IndexFilter('', false, true, true, true);
      expect(filter.matches(index('old', {closed: true}))).toBe(false);
      expect(filter.matches(index('live'))).toBe(true);
    });

    it('shows only unhealthy indices when healthy is off', () => {
      const filter = new IndexFilter('', true, true, false, true);
      expect(filter.matches(index('broken', {unhealthy: true}))).toBe(true);
      expect(filter.matches(index('fine'))).toBe(false);
    });

    it('shows everything when healthy is on', () => {
      expect(showAll().matches(index('broken', {unhealthy: true}))).toBe(true);
      expect(showAll().matches(index('fine'))).toBe(true);
    });
  });

  describe('sorting', () => {
    it('sorts ascending by name', () => {
      const sorting = new IndexFilter('', true, true, true, true).getSorting()!;
      expect([index('c'), index('a')].sort(sorting).map((i) => i.name)).toEqual(['a', 'c']);
    });

    it('sorts descending when asc is off', () => {
      const sorting = new IndexFilter('', true, true, true, false).getSorting()!;
      expect([index('a'), index('c')].sort(sorting).map((i) => i.name)).toEqual(['c', 'a']);
    });

    it('has no sorting for an unknown sort key', () => {
      const filter = showAll();
      filter.sort = 'size';
      expect(filter.getSorting()).toBeUndefined();
    });
  });

  describe('clone, equals and isBlank', () => {
    it('clones every field, timestamp included', () => {
      const filter = new IndexFilter('n', false, true, false, true, 5);
      const clone = filter.clone();
      expect(clone.equals(filter)).toBe(true);
      clone.name = 'other';
      expect(filter.name).toBe('n');
    });

    it('compares every field', () => {
      const filter = new IndexFilter('n', true, true, true, true, 1);
      expect(filter.equals(new IndexFilter('n', true, true, true, true, 1))).toBe(true);
      expect(filter.equals(new IndexFilter('m', true, true, true, true, 1))).toBe(false);
      expect(filter.equals(new IndexFilter('n', false, true, true, true, 1))).toBe(false);
      expect(filter.equals(null)).toBe(false);
    });

    it('is blank only with no name and everything shown, ascending', () => {
      expect(showAll().isBlank()).toBe(true);
      expect(new IndexFilter('n', true, true, true, true).isBlank()).toBe(false);
      expect(new IndexFilter('', false, true, true, true).isBlank()).toBe(false);
      expect(new IndexFilter('', true, false, true, true).isBlank()).toBe(false);
      expect(new IndexFilter('', true, true, true, false).isBlank()).toBe(false);
    });
  });
});

describe('fessOnly', () => {
  /** The screen's default has it off: everything shows. */
  const fessOnly = () => new IndexFilter('', true, true, true, true, 0, true);

  it('keeps the indices Fess owns', () => {
    expect(fessOnly().matches(index('fess.20260902134052541', {
      aliases: ['fess.search', 'fess.update'],
    }))).toBe(true);
    expect(fessOnly().matches(index('fess_config.scheduled_job'))).toBe(true);
    expect(fessOnly().matches(index('fess_log.search_log'))).toBe(true);
    expect(fessOnly().matches(index('configsync'))).toBe(true);
  });

  it('drops OpenSearch system indices and unrelated ones', () => {
    expect(fessOnly().matches(index('.plugins-ml-config', {special: true}))).toBe(false);
    expect(fessOnly().matches(index('top_queries-2026.09.02-04059'))).toBe(false);
  });

  it('is off by default, and off is not a filter', () => {
    const filter = new IndexFilter('', true, true, true, true);
    expect(filter.fessOnly).toBe(false);
    expect(filter.isBlank()).toBe(true);
    expect(filter.matches(index('top_queries-2026.09.02-04059'))).toBe(true);
  });

  it('is carried by clone and compared by equals', () => {
    const filter = fessOnly();
    expect(filter.clone().fessOnly).toBe(true);
    expect(filter.equals(filter.clone())).toBe(true);
    expect(filter.equals(new IndexFilter('', true, true, true, true))).toBe(false);
    expect(filter.isBlank()).toBe(false);
  });
});
