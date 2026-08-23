import {describe, expect, it} from 'vitest';
import {Alias, IndexAliases} from '@/model/alias';
import {AliasFilter} from '@/model/alias-filter';

/** Ported from tests/opensearch/*alias* and tests/models/alias-filter.test.js. */

describe('Alias', () => {
  it('lower-cases the alias and index names', () => {
    const alias = new Alias('MyAlias', 'MyIndex');
    expect(alias.alias).toBe('myalias');
    expect(alias.index).toBe('myindex');
  });

  it('defaults every field to an empty string', () => {
    const alias = new Alias();
    expect(alias.alias).toBe('');
    expect(alias.index).toBe('');
    expect(alias.filter).toBe('');
    expect(alias.index_routing).toBe('');
    expect(alias.search_routing).toBe('');
  });

  describe('validate', () => {
    it('requires a name', () => {
      expect(() => new Alias('', 'idx').validate()).toThrow('non empty name');
    });

    it('requires an index', () => {
      expect(() => new Alias('a', '').validate()).toThrow('valid index name');
    });

    it('accepts a complete alias', () => {
      expect(() => new Alias('a', 'idx').validate()).not.toThrow();
    });
  });

  describe('info', () => {
    it('carries index and alias', () => {
      expect(new Alias('a', 'idx').info()).toEqual({index: 'idx', alias: 'a'});
    });

    it('parses a string filter into an object', () => {
      const info = new Alias('a', 'idx', '{"term":{"x":1}}').info();
      expect(info.filter).toEqual({term: {x: 1}});
    });

    it('passes an object filter through', () => {
      expect(new Alias('a', 'idx', {term: {x: 1}}).info().filter).toEqual({term: {x: 1}});
    });

    it('leaves an empty filter out entirely', () => {
      expect(new Alias('a', 'idx', '').info()).not.toHaveProperty('filter');
    });

    it('includes routing only when set', () => {
      expect(new Alias('a', 'idx', '', 'r1', 'r2').info()).toMatchObject({
        index_routing: 'r1',
        search_routing: 'r2',
      });
      expect(new Alias('a', 'idx', '', '', '').info()).not.toHaveProperty('index_routing');
    });
  });

  it('compares every field', () => {
    const alias = new Alias('a', 'idx', '{}', 'r', 's');
    expect(alias.equals(alias.clone())).toBe(true);
    expect(alias.equals(new Alias('b', 'idx', '{}', 'r', 's'))).toBe(false);
    expect(alias.equals(new Alias('a', 'idx', '{"x":1}', 'r', 's'))).toBe(false);
  });
});

describe('IndexAliases.diff', () => {
  const aliases = (index: string, ...names: string[]) =>
    new IndexAliases(index, names.map((name) => new Alias(name, index)));

  it('finds an alias added to an index that already had some', () => {
    const before = [aliases('idx', 'one')];
    const after = [aliases('idx', 'one', 'two')];
    expect(IndexAliases.diff(before, after).map((a) => a.alias)).toEqual(['two']);
  });

  it('finds every alias of an index that is entirely new', () => {
    const before = [aliases('idx', 'one')];
    const after = [aliases('idx', 'one'), aliases('other', 'x', 'y')];
    expect(IndexAliases.diff(before, after).map((a) => a.alias)).toEqual(['x', 'y']);
  });

  it('finds removals when called the other way round', () => {
    const before = [aliases('idx', 'one', 'two')];
    const after = [aliases('idx', 'one')];
    expect(IndexAliases.diff(after, before).map((a) => a.alias)).toEqual(['two']);
  });

  it('reports nothing when nothing changed', () => {
    const before = [aliases('idx', 'one')];
    const after = [aliases('idx', 'one')];
    expect(IndexAliases.diff(before, after)).toEqual([]);
  });

  it('treats a changed filter as a different alias', () => {
    const before = [new IndexAliases('idx', [new Alias('a', 'idx', '{}')])];
    const after = [new IndexAliases('idx', [new Alias('a', 'idx', '{"term":{}}')])];
    expect(IndexAliases.diff(before, after)).toHaveLength(1);
  });

  it('clones deeply, so editing a clone does not touch the original', () => {
    const source = aliases('idx', 'one');
    const clone = source.clone();
    clone.aliases = [];
    expect(source.aliases).toHaveLength(1);
  });
});

describe('AliasFilter', () => {
  const entry = new IndexAliases('fess.20260101', [
    new Alias('fess.search', 'fess.20260101'),
    new Alias('fess.update', 'fess.20260101'),
  ]);

  it('is blank when neither field is set, and matches everything', () => {
    const filter = new AliasFilter('', '');
    expect(filter.isBlank()).toBe(true);
    expect(filter.matches(entry)).toBe(true);
  });

  it('matches on an index substring', () => {
    expect(new AliasFilter('2026', '').matches(entry)).toBe(true);
    expect(new AliasFilter('other', '').matches(entry)).toBe(false);
  });

  it('matches on an alias substring', () => {
    expect(new AliasFilter('', 'update').matches(entry)).toBe(true);
    expect(new AliasFilter('', 'absent').matches(entry)).toBe(false);
  });

  it('requires both when both are set', () => {
    expect(new AliasFilter('2026', 'search').matches(entry)).toBe(true);
    expect(new AliasFilter('other', 'search').matches(entry)).toBe(false);
  });

  it('sorts by index name', () => {
    const sorting = new AliasFilter('', '').getSorting();
    const list = [new IndexAliases('b', []), new IndexAliases('a', [])];
    expect(list.sort(sorting).map((e) => e.index)).toEqual(['a', 'b']);
  });

  it('clones and compares', () => {
    const filter = new AliasFilter('i', 'a');
    expect(filter.equals(filter.clone())).toBe(true);
    expect(filter.equals(new AliasFilter('i', 'b'))).toBe(false);
    expect(filter.equals(null)).toBe(false);
  });
});
