import {describe, expect, it} from 'vitest';
import {Paginator, type PageFilter} from '@/model/paginator';

/** Ported from tests/models/paginator.test.js. */

interface Item {
  name: string;
}

const blankFilter: PageFilter<Item> = {
  isBlank: () => true,
  matches: () => true,
  getSorting: () => undefined,
};

function startsWith(prefix: string): PageFilter<Item> {
  return {
    isBlank: () => false,
    matches: (item) => item.name.startsWith(prefix),
    getSorting: () => undefined,
  };
}

const sortingFilter: PageFilter<Item> = {
  isBlank: () => true,
  matches: () => true,
  getSorting: () => (a, b) => a.name.localeCompare(b.name),
};

const items = (...names: string[]): Item[] => names.map((name) => ({name}));

describe('Paginator', () => {
  it('starts on the given page and size', () => {
    const p = new Paginator<Item>(1, 10, items('a'), blankFilter);
    expect(p.getCurrentPage()).toBe(1);
    expect(p.getPageSize()).toBe(10);
    expect(p.getCollection()).toHaveLength(1);
  });

  it('treats an undefined collection as empty', () => {
    expect(new Paginator<Item>(1, 10, undefined, blankFilter).getCollection()).toEqual([]);
  });

  it('moves between pages and resizes', () => {
    const p = new Paginator<Item>(1, 10, [], blankFilter);
    p.nextPage();
    expect(p.getCurrentPage()).toBe(2);
    p.previousPage();
    expect(p.getCurrentPage()).toBe(1);
    p.setPageSize(3);
    expect(p.getPageSize()).toBe(3);
  });

  describe('getResults', () => {
    it('returns the whole collection when the filter is blank', () => {
      const p = new Paginator<Item>(1, 10, items('a', 'b'), blankFilter);
      expect(p.getResults()).toHaveLength(2);
    });

    it('filters when the filter is not blank', () => {
      const p = new Paginator<Item>(1, 10, items('fess.a', 'other'), startsWith('fess'));
      expect(p.getResults().map((i) => i.name)).toEqual(['fess.a']);
    });

    it('returns nothing when nothing matches', () => {
      const p = new Paginator<Item>(1, 10, items('other'), startsWith('fess'));
      expect(p.getResults()).toEqual([]);
    });
  });

  describe('setCollection', () => {
    it('replaces the collection', () => {
      const p = new Paginator<Item>(1, 10, items('a'), blankFilter);
      p.setCollection(items('b', 'c'));
      expect(p.getCollection().map((i) => i.name)).toEqual(['b', 'c']);
    });

    it('sorts when the filter supplies a sorting', () => {
      const p = new Paginator<Item>(1, 10, [], sortingFilter);
      p.setCollection(items('c', 'a', 'b'));
      expect(p.getCollection().map((i) => i.name)).toEqual(['a', 'b', 'c']);
    });

    it('does not sort the caller\'s array in place', () => {
      const original = items('c', 'a');
      const p = new Paginator<Item>(1, 10, [], sortingFilter);
      p.setCollection(original);
      expect(original.map((i) => i.name)).toEqual(['c', 'a']);
    });
  });

  describe('getPage', () => {
    const five = () => new Paginator<Item>(1, 2, items('a', 'b', 'c', 'd', 'e'), blankFilter);

    it('describes the first page', () => {
      const page = five().getPage();
      expect(page.elements.map((e) => e?.name)).toEqual(['a', 'b']);
      expect(page.total).toBe(5);
      expect(page.first).toBe(1);
      expect(page.last).toBe(2);
      expect(page.next).toBe(true);
      expect(page.previous).toBe(false);
    });

    it('describes a middle page', () => {
      const p = five();
      p.nextPage();
      const page = p.getPage();
      expect(page.elements.map((e) => e?.name)).toEqual(['c', 'd']);
      expect(page.first).toBe(3);
      expect(page.next).toBe(true);
      expect(page.previous).toBe(true);
    });

    it('describes the last page and pads it to the page size', () => {
      const p = five();
      p.nextPage();
      p.nextPage();
      const page = p.getPage();
      expect(page.elements).toHaveLength(2);
      expect(page.elements[0]?.name).toBe('e');
      // Padding keeps the overview grid at a fixed number of columns.
      expect(page.elements[1]).toBeNull();
      expect(page.last).toBe(5);
      expect(page.next).toBe(false);
    });

    it('handles an empty collection', () => {
      const page = new Paginator<Item>(1, 3, [], blankFilter).getPage();
      expect(page.total).toBe(0);
      expect(page.first).toBe(0);
      expect(page.elements).toEqual([null, null, null]);
    });

    it('walks back when the current page is beyond the results', () => {
      const p = new Paginator<Item>(5, 2, items('a', 'b'), blankFilter);
      const page = p.getPage();
      expect(p.getCurrentPage()).toBe(1);
      expect(page.elements.map((e) => e?.name)).toEqual(['a', 'b']);
    });
  });
});
