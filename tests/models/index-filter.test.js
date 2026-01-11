/**
 * Tests for IndexFilter class
 * Tests index filtering functionality
 */

const fs = require('fs');
const path = require('path');

// Load utility functions first
const utilCode = fs.readFileSync(
  path.join(__dirname, '../../src/kopf/util.js'),
  'utf8'
);
eval(utilCode);

// Load IndexFilter
const indexFilterCode = fs.readFileSync(
  path.join(__dirname, '../../src/kopf/models/index_filter.js'),
  'utf8'
);
eval(indexFilterCode);

describe('IndexFilter', () => {
  // Helper to create mock index
  function createMockIndex(name, options = {}) {
    return {
      name: name,
      special: options.special || false,
      closed: options.closed || false,
      unhealthy: options.unhealthy || false,
      aliases: options.aliases || []
    };
  }

  describe('initialization', () => {
    test('should create filter with all parameters', () => {
      const filter = new IndexFilter('test', true, false, true, true, 12345);

      expect(filter.name).toBe('test');
      expect(filter.closed).toBe(true);
      expect(filter.special).toBe(false);
      expect(filter.healthy).toBe(true);
      expect(filter.asc).toBe(true);
      expect(filter.timestamp).toBe(12345);
      expect(filter.sort).toBe('name');
    });

    test('should create empty filter', () => {
      const filter = new IndexFilter('', true, true, true, true, 0);

      expect(filter.name).toBe('');
      expect(filter.isBlank()).toBe(true);
    });
  });

  describe('matching', () => {
    test('should match index by exact name', () => {
      const filter = new IndexFilter('test-index', true, true, true, true, 0);
      const index = createMockIndex('test-index');

      expect(filter.matches(index)).toBe(true);
    });

    test('should match index by partial name', () => {
      const filter = new IndexFilter('test', true, true, true, true, 0);
      const index = createMockIndex('test-index');

      expect(filter.matches(index)).toBe(true);
    });

    test('should match index by regex', () => {
      const filter = new IndexFilter('test-.*', true, true, true, true, 0);
      const index = createMockIndex('test-index');

      expect(filter.matches(index)).toBe(true);
    });

    test('should match index case-insensitively', () => {
      const filter = new IndexFilter('TEST', true, true, true, true, 0);
      const index = createMockIndex('test-index');

      expect(filter.matches(index)).toBe(true);
    });

    test('should not match non-matching index', () => {
      const filter = new IndexFilter('other', true, true, true, true, 0);
      const index = createMockIndex('test-index');

      expect(filter.matches(index)).toBe(false);
    });

    test('should match by alias', () => {
      const filter = new IndexFilter('my-alias', true, true, true, true, 0);
      const index = createMockIndex('test-index', { aliases: ['my-alias'] });

      expect(filter.matches(index)).toBe(true);
    });

    test('should match by alias with regex', () => {
      const filter = new IndexFilter('my-.*', true, true, true, true, 0);
      const index = createMockIndex('test-index', { aliases: ['my-alias'] });

      expect(filter.matches(index)).toBe(true);
    });
  });

  describe('special index filtering', () => {
    test('should exclude special indices when special=false', () => {
      const filter = new IndexFilter('', true, false, true, true, 0);
      const index = createMockIndex('.kibana', { special: true });

      expect(filter.matches(index)).toBe(false);
    });

    test('should include special indices when special=true', () => {
      const filter = new IndexFilter('', true, true, true, true, 0);
      const index = createMockIndex('.kibana', { special: true });

      expect(filter.matches(index)).toBe(true);
    });
  });

  describe('closed index filtering', () => {
    test('should exclude closed indices when closed=false', () => {
      const filter = new IndexFilter('', false, true, true, true, 0);
      const index = createMockIndex('test-index', { closed: true });

      expect(filter.matches(index)).toBe(false);
    });

    test('should include closed indices when closed=true', () => {
      const filter = new IndexFilter('', true, true, true, true, 0);
      const index = createMockIndex('test-index', { closed: true });

      expect(filter.matches(index)).toBe(true);
    });
  });

  describe('health filtering', () => {
    test('should show only unhealthy when healthy=false', () => {
      const filter = new IndexFilter('', true, true, false, true, 0);
      const healthyIndex = createMockIndex('healthy-index', { unhealthy: false });
      const unhealthyIndex = createMockIndex('unhealthy-index', { unhealthy: true });

      expect(filter.matches(healthyIndex)).toBe(false);
      expect(filter.matches(unhealthyIndex)).toBe(true);
    });

    test('should show all indices when healthy=true', () => {
      const filter = new IndexFilter('', true, true, true, true, 0);
      const healthyIndex = createMockIndex('healthy-index', { unhealthy: false });
      const unhealthyIndex = createMockIndex('unhealthy-index', { unhealthy: true });

      expect(filter.matches(healthyIndex)).toBe(true);
      expect(filter.matches(unhealthyIndex)).toBe(true);
    });
  });

  describe('sorting', () => {
    test('should sort by name ascending', () => {
      const filter = new IndexFilter('', true, true, true, true, 0);
      const sorting = filter.getSorting();

      const indices = [
        { name: 'zebra' },
        { name: 'alpha' },
        { name: 'beta' }
      ];

      indices.sort(sorting);

      expect(indices[0].name).toBe('alpha');
      expect(indices[1].name).toBe('beta');
      expect(indices[2].name).toBe('zebra');
    });

    test('should sort by name descending', () => {
      const filter = new IndexFilter('', true, true, true, false, 0);
      const sorting = filter.getSorting();

      const indices = [
        { name: 'alpha' },
        { name: 'zebra' },
        { name: 'beta' }
      ];

      indices.sort(sorting);

      expect(indices[0].name).toBe('zebra');
      expect(indices[1].name).toBe('beta');
      expect(indices[2].name).toBe('alpha');
    });
  });

  describe('clone', () => {
    test('should create identical copy', () => {
      const filter = new IndexFilter('test', true, false, true, true, 12345);
      const clone = filter.clone();

      expect(clone.name).toBe(filter.name);
      expect(clone.closed).toBe(filter.closed);
      expect(clone.special).toBe(filter.special);
      expect(clone.healthy).toBe(filter.healthy);
      expect(clone.asc).toBe(filter.asc);
      expect(clone.timestamp).toBe(filter.timestamp);
    });

    test('should create independent copy', () => {
      const filter = new IndexFilter('test', true, false, true, true, 12345);
      const clone = filter.clone();

      clone.name = 'changed';

      expect(filter.name).toBe('test');
      expect(clone.name).toBe('changed');
    });
  });

  describe('equality', () => {
    test('should be equal to filter with same values', () => {
      const filter1 = new IndexFilter('test', true, false, true, true, 12345);
      const filter2 = new IndexFilter('test', true, false, true, true, 12345);

      expect(filter1.equals(filter2)).toBe(true);
    });

    test('should not be equal when name differs', () => {
      const filter1 = new IndexFilter('test1', true, true, true, true, 0);
      const filter2 = new IndexFilter('test2', true, true, true, true, 0);

      expect(filter1.equals(filter2)).toBe(false);
    });

    test('should not be equal when closed differs', () => {
      const filter1 = new IndexFilter('test', true, true, true, true, 0);
      const filter2 = new IndexFilter('test', false, true, true, true, 0);

      expect(filter1.equals(filter2)).toBe(false);
    });

    test('should handle null comparison', () => {
      const filter = new IndexFilter('test', true, true, true, true, 0);

      expect(filter.equals(null)).toBe(false);
    });
  });

  describe('isBlank', () => {
    test('should be blank with default values', () => {
      const filter = new IndexFilter('', true, true, true, true, 0);

      expect(filter.isBlank()).toBe(true);
    });

    test('should not be blank with name', () => {
      const filter = new IndexFilter('test', true, true, true, true, 0);

      expect(filter.isBlank()).toBe(false);
    });

    test('should not be blank when closed=false', () => {
      const filter = new IndexFilter('', false, true, true, true, 0);

      expect(filter.isBlank()).toBe(false);
    });

    test('should not be blank when special=false', () => {
      const filter = new IndexFilter('', true, false, true, true, 0);

      expect(filter.isBlank()).toBe(false);
    });

    test('should not be blank when healthy=false', () => {
      const filter = new IndexFilter('', true, true, false, true, 0);

      expect(filter.isBlank()).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('should handle invalid regex gracefully', () => {
      const filter = new IndexFilter('[invalid', true, true, true, true, 0);
      const index = createMockIndex('test-invalid-index');

      // Should fall back to simple matching
      expect(() => filter.matches(index)).not.toThrow();
    });

    test('should handle empty aliases array', () => {
      const filter = new IndexFilter('alias', true, true, true, true, 0);
      const index = createMockIndex('test-index', { aliases: [] });

      expect(filter.matches(index)).toBe(false);
    });

    test('should handle whitespace in filter name', () => {
      const filter = new IndexFilter('  test  ', true, true, true, true, 0);
      const index = createMockIndex('test-index');

      expect(filter.matches(index)).toBe(true);
    });
  });
});
