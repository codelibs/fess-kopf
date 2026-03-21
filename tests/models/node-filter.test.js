/**
 * Tests for NodeFilter class
 * Tests node filtering and sorting functionality
 */

const fs = require('fs');
const path = require('path');

// Load utility functions first
const utilCode = fs.readFileSync(
  path.join(__dirname, '../../src/kopf/util.js'),
  'utf8'
);
eval(utilCode);

// Load NodeFilter
const nodeFilterCode = fs.readFileSync(
  path.join(__dirname, '../../src/kopf/models/node_filter.js'),
  'utf8'
);
eval(nodeFilterCode);

describe('NodeFilter', () => {
  function createMockNode(name, options = {}) {
    return {
      name: name,
      data: options.data !== undefined ? options.data : true,
      master: options.master !== undefined ? options.master : false,
      client: options.client !== undefined ? options.client : false
    };
  }

  describe('initialization', () => {
    test('should create filter with all parameters', () => {
      const filter = new NodeFilter('node1', true, true, true, 12345);
      expect(filter.name).toBe('node1');
      expect(filter.data).toBe(true);
      expect(filter.master).toBe(true);
      expect(filter.client).toBe(true);
      expect(filter.timestamp).toBe(12345);
    });

    test('should create empty filter', () => {
      const filter = new NodeFilter('', true, true, true, 0);
      expect(filter.name).toBe('');
    });
  });

  describe('isBlank', () => {
    test('should return true when name is empty and all types selected', () => {
      const filter = new NodeFilter('', true, true, true, 0);
      expect(filter.isBlank()).toBe(true);
    });

    test('should return false when name has value', () => {
      const filter = new NodeFilter('node', true, true, true, 0);
      expect(filter.isBlank()).toBe(false);
    });

    test('should return false when not all types selected', () => {
      const filter = new NodeFilter('', false, true, true, 0);
      expect(filter.isBlank()).toBe(false);
    });
  });

  describe('matches', () => {
    test('should match all when filter is blank', () => {
      const filter = new NodeFilter('', true, true, true, 0);
      expect(filter.matches(createMockNode('any-node'))).toBe(true);
    });

    test('should match by name case-insensitively', () => {
      const filter = new NodeFilter('NODE', true, true, true, 0);
      expect(filter.matches(createMockNode('my-node-1'))).toBe(true);
    });

    test('should filter by data node type', () => {
      const filter = new NodeFilter('', true, false, false, 0);
      expect(filter.matches(createMockNode('n1', {data: true}))).toBe(true);
      expect(filter.matches(createMockNode('n2', {data: false, master: true}))).toBe(false);
    });

    test('should filter by master node type', () => {
      const filter = new NodeFilter('', false, true, false, 0);
      expect(filter.matches(createMockNode('n1', {data: false, master: true}))).toBe(true);
      expect(filter.matches(createMockNode('n2', {data: true, master: false}))).toBe(false);
    });

    test('should filter by client node type', () => {
      const filter = new NodeFilter('', false, false, true, 0);
      expect(filter.matches(createMockNode('n1', {data: false, client: true}))).toBe(true);
      expect(filter.matches(createMockNode('n2', {data: true, client: false}))).toBe(false);
    });

    test('should combine name and type filtering', () => {
      const filter = new NodeFilter('prod', true, false, false, 0);
      expect(filter.matches(createMockNode('prod-data-1', {data: true}))).toBe(true);
      expect(filter.matches(createMockNode('staging-data', {data: true}))).toBe(false);
      expect(filter.matches(createMockNode('prod-master', {data: false, master: true}))).toBe(false);
    });
  });

  describe('matchesName', () => {
    test('should match when name is empty', () => {
      const filter = new NodeFilter('', true, true, true, 0);
      expect(filter.matchesName('any-name')).toBe(true);
    });

    test('should match substring case-insensitively', () => {
      const filter = new NodeFilter('PROD', true, true, true, 0);
      expect(filter.matchesName('production-node')).toBe(true);
    });

    test('should not match when name does not contain filter', () => {
      const filter = new NodeFilter('staging', true, true, true, 0);
      expect(filter.matchesName('production-node')).toBe(false);
    });
  });

  describe('getSorting', () => {
    test('should return a sorting function', () => {
      const filter = new NodeFilter('', true, true, true, 0);
      expect(typeof filter.getSorting()).toBe('function');
    });

    test('should sort nodes alphabetically by name', () => {
      const filter = new NodeFilter('', true, true, true, 0);
      const sorting = filter.getSorting();
      const a = createMockNode('alpha');
      const b = createMockNode('beta');
      expect(sorting(a, b)).toBeLessThan(0);
      expect(sorting(b, a)).toBeGreaterThan(0);
      expect(sorting(a, a)).toBe(0);
    });
  });

  describe('clone', () => {
    test('should create independent copy', () => {
      const filter = new NodeFilter('test', true, false, true);
      const clone = filter.clone();
      expect(clone.name).toBe('test');
      expect(clone.data).toBe(true);
      expect(clone.master).toBe(false);
      expect(clone.client).toBe(true);
      clone.name = 'changed';
      expect(filter.name).toBe('test');
    });
  });

  describe('equals', () => {
    test('should return true for equal filters', () => {
      const f1 = new NodeFilter('test', true, true, true, 100);
      const f2 = new NodeFilter('test', true, true, true, 100);
      expect(f1.equals(f2)).toBe(true);
    });

    test('should return false for different filters', () => {
      const f1 = new NodeFilter('test', true, true, true, 100);
      const f2 = new NodeFilter('other', true, true, true, 100);
      expect(f1.equals(f2)).toBe(false);
    });

    test('should return false for null', () => {
      const filter = new NodeFilter('test', true, true, true, 0);
      expect(filter.equals(null)).toBe(false);
    });
  });
});
