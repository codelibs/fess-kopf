/**
 * Tests for Paginator and Page classes
 * Tests pagination functionality
 */

const fs = require('fs');
const path = require('path');

// Load utility functions first
const utilCode = fs.readFileSync(
  path.join(__dirname, '../../src/kopf/util.js'),
  'utf8'
);
eval(utilCode);

// Load Paginator
const paginatorCode = fs.readFileSync(
  path.join(__dirname, '../../src/kopf/models/paginator.js'),
  'utf8'
);
eval(paginatorCode);

describe('Paginator', () => {
  // Simple mock filter
  function createMockFilter(options = {}) {
    return {
      isBlank: () => options.isBlank !== false,
      matches: (item) => options.matchFn ? options.matchFn(item) : true,
      getSorting: () => options.sorting || null
    };
  }

  describe('initialization', () => {
    test('should create paginator with default values', () => {
      const filter = createMockFilter();
      const paginator = new Paginator(1, 10, [], filter);

      expect(paginator.getCurrentPage()).toBe(1);
      expect(paginator.getPageSize()).toBe(10);
      expect(paginator.getCollection()).toEqual([]);
    });

    test('should create paginator with collection', () => {
      const filter = createMockFilter();
      const items = [1, 2, 3, 4, 5];
      const paginator = new Paginator(1, 10, items, filter);

      expect(paginator.getCollection()).toEqual(items);
    });

    test('should handle undefined collection', () => {
      const filter = createMockFilter();
      const paginator = new Paginator(1, 10, undefined, filter);

      expect(paginator.getCollection()).toEqual([]);
    });
  });

  describe('page navigation', () => {
    test('should go to next page', () => {
      const filter = createMockFilter();
      const paginator = new Paginator(1, 10, [], filter);

      paginator.nextPage();

      expect(paginator.getCurrentPage()).toBe(2);
    });

    test('should go to previous page', () => {
      const filter = createMockFilter();
      const paginator = new Paginator(3, 10, [], filter);

      paginator.previousPage();

      expect(paginator.getCurrentPage()).toBe(2);
    });

    test('should change page size', () => {
      const filter = createMockFilter();
      const paginator = new Paginator(1, 10, [], filter);

      paginator.setPageSize(20);

      expect(paginator.getPageSize()).toBe(20);
    });
  });

  describe('getResults', () => {
    test('should return all items when filter is blank', () => {
      const filter = createMockFilter({ isBlank: true });
      const items = [1, 2, 3, 4, 5];
      const paginator = new Paginator(1, 10, items, filter);

      expect(paginator.getResults()).toEqual(items);
    });

    test('should filter items when filter is not blank', () => {
      const filter = createMockFilter({
        isBlank: false,
        matchFn: (item) => item > 2
      });
      const items = [1, 2, 3, 4, 5];
      const paginator = new Paginator(1, 10, items, filter);

      expect(paginator.getResults()).toEqual([3, 4, 5]);
    });

    test('should return empty array for no matches', () => {
      const filter = createMockFilter({
        isBlank: false,
        matchFn: () => false
      });
      const items = [1, 2, 3, 4, 5];
      const paginator = new Paginator(1, 10, items, filter);

      expect(paginator.getResults()).toEqual([]);
    });
  });

  describe('setCollection', () => {
    test('should update collection', () => {
      const filter = createMockFilter();
      const paginator = new Paginator(1, 10, [1, 2, 3], filter);

      paginator.setCollection([4, 5, 6]);

      expect(paginator.getCollection()).toEqual([4, 5, 6]);
    });

    test('should sort collection when sorting is defined', () => {
      const filter = createMockFilter({
        sorting: (a, b) => b - a // descending
      });
      const paginator = new Paginator(1, 10, [], filter);

      paginator.setCollection([1, 3, 2, 5, 4]);

      expect(paginator.getCollection()).toEqual([5, 4, 3, 2, 1]);
    });
  });

  describe('getPage', () => {
    test('should return first page correctly', () => {
      const filter = createMockFilter();
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      const paginator = new Paginator(1, 5, items, filter);

      const page = paginator.getPage();

      expect(page.elements.slice(0, 5)).toEqual([1, 2, 3, 4, 5]);
      expect(page.total).toBe(12);
      expect(page.first).toBe(1);
      expect(page.last).toBe(5);
      expect(page.next).toBe(true);
      expect(page.previous).toBe(false);
    });

    test('should return middle page correctly', () => {
      const filter = createMockFilter();
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      const paginator = new Paginator(2, 5, items, filter);

      const page = paginator.getPage();

      expect(page.elements.slice(0, 5)).toEqual([6, 7, 8, 9, 10]);
      expect(page.first).toBe(6);
      expect(page.last).toBe(10);
      expect(page.next).toBe(true);
      expect(page.previous).toBe(true);
    });

    test('should return last page correctly', () => {
      const filter = createMockFilter();
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      const paginator = new Paginator(3, 5, items, filter);

      const page = paginator.getPage();

      expect(page.elements[0]).toBe(11);
      expect(page.elements[1]).toBe(12);
      expect(page.first).toBe(11);
      expect(page.last).toBe(12);
      expect(page.next).toBe(false);
      expect(page.previous).toBe(true);
    });

    test('should handle empty collection', () => {
      const filter = createMockFilter();
      const paginator = new Paginator(1, 5, [], filter);

      const page = paginator.getPage();

      expect(page.total).toBe(0);
      expect(page.first).toBe(0);
      expect(page.last).toBe(0);
      expect(page.next).toBe(false);
      expect(page.previous).toBe(false);
    });

    test('should pad elements to page size', () => {
      const filter = createMockFilter();
      const items = [1, 2];
      const paginator = new Paginator(1, 5, items, filter);

      const page = paginator.getPage();

      expect(page.elements.length).toBe(5);
      expect(page.elements[0]).toBe(1);
      expect(page.elements[1]).toBe(2);
      expect(page.elements[2]).toBeNull();
      expect(page.elements[3]).toBeNull();
      expect(page.elements[4]).toBeNull();
    });

    test('should auto-adjust page when beyond results', () => {
      const filter = createMockFilter();
      const items = [1, 2, 3];
      const paginator = new Paginator(10, 5, items, filter);

      const page = paginator.getPage();

      // Should auto-adjust to page 1 since we only have 3 items
      expect(page.first).toBe(1);
      expect(page.elements[0]).toBe(1);
    });
  });
});

describe('Page', () => {
  test('should create page with all properties', () => {
    const elements = [1, 2, 3];
    const page = new Page(elements, 10, 1, 3, true, false);

    expect(page.elements).toEqual(elements);
    expect(page.total).toBe(10);
    expect(page.first).toBe(1);
    expect(page.last).toBe(3);
    expect(page.next).toBe(true);
    expect(page.previous).toBe(false);
  });
});
