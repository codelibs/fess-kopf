/**
 * Tests for AliasFilter class
 * Tests alias filtering and sorting functionality
 */

const fs = require('fs');
const path = require('path');

// Load utility functions first
const utilCode = fs.readFileSync(
  path.join(__dirname, '../../src/kopf/util.js'),
  'utf8'
);
eval(utilCode);

// Load AliasFilter
const aliasFilterCode = fs.readFileSync(
  path.join(__dirname, '../../src/kopf/models/alias_filter.js'),
  'utf8'
);
eval(aliasFilterCode);

describe('AliasFilter', () => {
  function createMockIndexAlias(index, aliasNames) {
    return {
      index: index,
      aliases: aliasNames.map(function(name) {
        return {alias: name};
      })
    };
  }

  describe('initialization', () => {
    test('should create filter with index and alias', () => {
      const filter = new AliasFilter('my-index', 'my-alias');
      expect(filter.index).toBe('my-index');
      expect(filter.alias).toBe('my-alias');
    });

    test('should create empty filter', () => {
      const filter = new AliasFilter('', '');
      expect(filter.index).toBe('');
      expect(filter.alias).toBe('');
    });
  });

  describe('isBlank', () => {
    test('should return true when both index and alias are empty', () => {
      const filter = new AliasFilter('', '');
      expect(filter.isBlank()).toBe(true);
    });

    test('should return false when index has value', () => {
      const filter = new AliasFilter('test', '');
      expect(filter.isBlank()).toBe(false);
    });

    test('should return false when alias has value', () => {
      const filter = new AliasFilter('', 'alias');
      expect(filter.isBlank()).toBe(false);
    });
  });

  describe('matches', () => {
    test('should match all when filter is blank', () => {
      const filter = new AliasFilter('', '');
      expect(filter.matches(createMockIndexAlias('test', ['alias1']))).toBe(true);
    });

    test('should match by index name substring', () => {
      const filter = new AliasFilter('prod', '');
      expect(filter.matches(createMockIndexAlias('production-data', ['a1']))).toBe(true);
    });

    test('should not match when index does not contain filter', () => {
      const filter = new AliasFilter('staging', '');
      expect(filter.matches(createMockIndexAlias('production-data', ['a1']))).toBe(false);
    });

    test('should match by alias name substring', () => {
      const filter = new AliasFilter('', 'live');
      expect(filter.matches(createMockIndexAlias('idx', ['live-alias']))).toBe(true);
    });

    test('should not match when no alias matches', () => {
      const filter = new AliasFilter('', 'missing');
      expect(filter.matches(createMockIndexAlias('idx', ['alias1', 'alias2']))).toBe(false);
    });

    test('should require both index and alias to match', () => {
      const filter = new AliasFilter('prod', 'live');
      expect(filter.matches(
        createMockIndexAlias('production', ['live-alias'])
      )).toBe(true);
      expect(filter.matches(
        createMockIndexAlias('staging', ['live-alias'])
      )).toBe(false);
    });
  });

  describe('getSorting', () => {
    test('should return a sorting function', () => {
      const filter = new AliasFilter('', '');
      expect(typeof filter.getSorting()).toBe('function');
    });

    test('should sort by index name alphabetically', () => {
      const filter = new AliasFilter('', '');
      const sorting = filter.getSorting();
      const a = createMockIndexAlias('alpha', ['a1']);
      const b = createMockIndexAlias('beta', ['b1']);
      expect(sorting(a, b)).toBeLessThan(0);
      expect(sorting(b, a)).toBeGreaterThan(0);
      expect(sorting(a, a)).toBe(0);
    });
  });

  describe('clone', () => {
    test('should create independent copy', () => {
      const filter = new AliasFilter('idx', 'alias');
      const clone = filter.clone();
      expect(clone.index).toBe('idx');
      expect(clone.alias).toBe('alias');
      clone.index = 'changed';
      expect(filter.index).toBe('idx');
    });
  });

  describe('equals', () => {
    test('should return true for equal filters', () => {
      const f1 = new AliasFilter('idx', 'alias');
      const f2 = new AliasFilter('idx', 'alias');
      expect(f1.equals(f2)).toBe(true);
    });

    test('should return false for different filters', () => {
      const f1 = new AliasFilter('idx', 'alias');
      const f2 = new AliasFilter('idx', 'other');
      expect(f1.equals(f2)).toBe(false);
    });

    test('should return false for null', () => {
      const filter = new AliasFilter('idx', 'alias');
      expect(filter.equals(null)).toBe(false);
    });
  });
});
