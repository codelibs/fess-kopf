/**
 * Tests for IndexTemplateFilter class
 * Tests index template filtering and sorting functionality
 */

const fs = require('fs');
const path = require('path');

// Load utility functions first
const utilCode = fs.readFileSync(
  path.join(__dirname, '../../src/kopf/util.js'),
  'utf8'
);
eval(utilCode);

// Load IndexTemplateFilter
const filterCode = fs.readFileSync(
  path.join(__dirname, '../../src/kopf/models/index_template_filter.js'),
  'utf8'
);
eval(filterCode);

describe('IndexTemplateFilter', () => {
  function createMockTemplate(name, pattern) {
    return {
      name: name,
      body: {template: pattern}
    };
  }

  describe('initialization', () => {
    test('should create filter with name and template', () => {
      const filter = new IndexTemplateFilter('tmpl', 'pattern*');
      expect(filter.name).toBe('tmpl');
      expect(filter.template).toBe('pattern*');
    });

    test('should create empty filter', () => {
      const filter = new IndexTemplateFilter('', '');
      expect(filter.name).toBe('');
      expect(filter.template).toBe('');
    });
  });

  describe('isBlank', () => {
    test('should return true when both fields are empty', () => {
      const filter = new IndexTemplateFilter('', '');
      expect(filter.isBlank()).toBe(true);
    });

    test('should return false when name has value', () => {
      const filter = new IndexTemplateFilter('tmpl', '');
      expect(filter.isBlank()).toBe(false);
    });

    test('should return false when template has value', () => {
      const filter = new IndexTemplateFilter('', 'pattern');
      expect(filter.isBlank()).toBe(false);
    });
  });

  describe('matches', () => {
    test('should match all when filter is blank', () => {
      const filter = new IndexTemplateFilter('', '');
      expect(filter.matches(createMockTemplate('my-tmpl', 'log*'))).toBe(true);
    });

    test('should match by name substring', () => {
      const filter = new IndexTemplateFilter('tmpl', '');
      expect(filter.matches(createMockTemplate('my-tmpl', 'log*'))).toBe(true);
    });

    test('should not match when name does not contain filter', () => {
      const filter = new IndexTemplateFilter('missing', '');
      expect(filter.matches(createMockTemplate('my-tmpl', 'log*'))).toBe(false);
    });

    test('should match by template pattern substring', () => {
      const filter = new IndexTemplateFilter('', 'log');
      expect(filter.matches(createMockTemplate('tmpl', 'log-*'))).toBe(true);
    });

    test('should require both name and pattern to match', () => {
      const filter = new IndexTemplateFilter('my', 'log');
      expect(filter.matches(createMockTemplate('my-tmpl', 'log-*'))).toBe(true);
      expect(filter.matches(createMockTemplate('my-tmpl', 'data-*'))).toBe(false);
    });
  });

  describe('getSorting', () => {
    test('should return a sorting function', () => {
      const filter = new IndexTemplateFilter('', '');
      expect(typeof filter.getSorting()).toBe('function');
    });

    test('should sort templates alphabetically by name', () => {
      const filter = new IndexTemplateFilter('', '');
      const sorting = filter.getSorting();
      const a = createMockTemplate('alpha', 'a*');
      const b = createMockTemplate('beta', 'b*');
      expect(sorting(a, b)).toBeLessThan(0);
      expect(sorting(b, a)).toBeGreaterThan(0);
      expect(sorting(a, a)).toBe(0);
    });
  });

  describe('clone', () => {
    test('should create independent copy', () => {
      const filter = new IndexTemplateFilter('tmpl', 'pat');
      const clone = filter.clone();
      expect(clone.name).toBe('tmpl');
      expect(clone.template).toBe('pat');
    });
  });

  describe('equals', () => {
    test('should return true for equal filters', () => {
      const f1 = new IndexTemplateFilter('tmpl', 'pat');
      const f2 = new IndexTemplateFilter('tmpl', 'pat');
      expect(f1.equals(f2)).toBe(true);
    });

    test('should return false for different filters', () => {
      const f1 = new IndexTemplateFilter('tmpl', 'pat');
      const f2 = new IndexTemplateFilter('tmpl', 'other');
      expect(f1.equals(f2)).toBe(false);
    });

    test('should return false for null', () => {
      const filter = new IndexTemplateFilter('tmpl', 'pat');
      expect(filter.equals(null)).toBe(false);
    });
  });
});
