/**
 * Tests for WarmerFilter class
 * Tests warmer filtering and sorting functionality
 */

const fs = require('fs');
const path = require('path');

// Load utility functions first
const utilCode = fs.readFileSync(
  path.join(__dirname, '../../src/kopf/util.js'),
  'utf8'
);
eval(utilCode);

// Load WarmerFilter
const warmerFilterCode = fs.readFileSync(
  path.join(__dirname, '../../src/kopf/models/warmer_filter.js'),
  'utf8'
);
eval(warmerFilterCode);

describe('WarmerFilter', () => {
  function createMockWarmer(id) {
    return {
      id: id,
      index: 'test-index',
      source: '{}',
      types: ['type1']
    };
  }

  describe('initialization', () => {
    test('should create filter with id', () => {
      const filter = new WarmerFilter('test');
      expect(filter.id).toBe('test');
    });

    test('should create empty filter', () => {
      const filter = new WarmerFilter('');
      expect(filter.id).toBe('');
    });
  });

  describe('isBlank', () => {
    test('should return true when id is empty', () => {
      const filter = new WarmerFilter('');
      expect(filter.isBlank()).toBe(true);
    });

    test('should return true when id is undefined', () => {
      const filter = new WarmerFilter(undefined);
      expect(filter.isBlank()).toBe(true);
    });

    test('should return false when id has value', () => {
      const filter = new WarmerFilter('warmer1');
      expect(filter.isBlank()).toBe(false);
    });
  });

  describe('matches', () => {
    test('should match all when filter is blank', () => {
      const filter = new WarmerFilter('');
      expect(filter.matches(createMockWarmer('any-warmer'))).toBe(true);
    });

    test('should match by id substring', () => {
      const filter = new WarmerFilter('warm');
      expect(filter.matches(createMockWarmer('my-warmer'))).toBe(true);
    });

    test('should not match when id does not contain filter', () => {
      const filter = new WarmerFilter('missing');
      expect(filter.matches(createMockWarmer('my-warmer'))).toBe(false);
    });

    test('should match exact id', () => {
      const filter = new WarmerFilter('my-warmer');
      expect(filter.matches(createMockWarmer('my-warmer'))).toBe(true);
    });
  });

  describe('getSorting', () => {
    test('should return a sorting function', () => {
      const filter = new WarmerFilter('');
      expect(typeof filter.getSorting()).toBe('function');
    });

    test('should sort warmers alphabetically by id', () => {
      const filter = new WarmerFilter('');
      const sorting = filter.getSorting();
      const a = createMockWarmer('alpha-warmer');
      const b = createMockWarmer('beta-warmer');
      expect(sorting(a, b)).toBeLessThan(0);
      expect(sorting(b, a)).toBeGreaterThan(0);
      expect(sorting(a, a)).toBe(0);
    });
  });

  describe('clone', () => {
    test('should create independent copy', () => {
      const filter = new WarmerFilter('test');
      const clone = filter.clone();
      expect(clone.id).toBe('test');
      clone.id = 'changed';
      expect(filter.id).toBe('test');
    });
  });

  describe('equals', () => {
    test('should return true for equal filters', () => {
      const f1 = new WarmerFilter('test');
      const f2 = new WarmerFilter('test');
      expect(f1.equals(f2)).toBe(true);
    });

    test('should return false for different filters', () => {
      const f1 = new WarmerFilter('test');
      const f2 = new WarmerFilter('other');
      expect(f1.equals(f2)).toBe(false);
    });

    test('should return false for null', () => {
      const filter = new WarmerFilter('test');
      expect(filter.equals(null)).toBe(false);
    });
  });
});
