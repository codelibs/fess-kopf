/**
 * Tests for SnapshotFilter class
 * Tests snapshot filtering and sorting functionality
 */

const fs = require('fs');
const path = require('path');

// Load utility functions first
const utilCode = fs.readFileSync(
  path.join(__dirname, '../../src/kopf/util.js'),
  'utf8'
);
eval(utilCode);

// Load SnapshotFilter
const snapshotFilterCode = fs.readFileSync(
  path.join(__dirname, '../../src/kopf/models/snapshot_filter.js'),
  'utf8'
);
eval(snapshotFilterCode);

describe('SnapshotFilter', () => {
  function createMockSnapshot(name) {
    return {
      name: name,
      state: 'SUCCESS',
      indices: ['index1'],
      start_time_in_millis: 1000,
      end_time_in_millis: 2000
    };
  }

  describe('initialization', () => {
    test('should create filter with name parameter', () => {
      const filter = new SnapshotFilter('test');
      expect(filter.name).toBe('test');
    });

    test('should create empty filter', () => {
      const filter = new SnapshotFilter('');
      expect(filter.name).toBe('');
    });
  });

  describe('isBlank', () => {
    test('should return true when name is empty', () => {
      const filter = new SnapshotFilter('');
      expect(filter.isBlank()).toBe(true);
    });

    test('should return true when name is undefined', () => {
      const filter = new SnapshotFilter(undefined);
      expect(filter.isBlank()).toBe(true);
    });

    test('should return false when name has value', () => {
      const filter = new SnapshotFilter('snap');
      expect(filter.isBlank()).toBe(false);
    });
  });

  describe('matches', () => {
    test('should match all when filter is blank', () => {
      const filter = new SnapshotFilter('');
      expect(filter.matches(createMockSnapshot('my-snapshot'))).toBe(true);
    });

    test('should match by name substring', () => {
      const filter = new SnapshotFilter('snap');
      expect(filter.matches(createMockSnapshot('my-snapshot'))).toBe(true);
    });

    test('should match case-insensitively', () => {
      const filter = new SnapshotFilter('SNAP');
      expect(filter.matches(createMockSnapshot('my-snapshot'))).toBe(true);
    });

    test('should not match when name does not contain filter', () => {
      const filter = new SnapshotFilter('backup');
      expect(filter.matches(createMockSnapshot('my-snapshot'))).toBe(false);
    });

    test('should match exact name', () => {
      const filter = new SnapshotFilter('my-snapshot');
      expect(filter.matches(createMockSnapshot('my-snapshot'))).toBe(true);
    });
  });

  describe('getSorting', () => {
    test('should return a sorting function', () => {
      const filter = new SnapshotFilter('');
      expect(typeof filter.getSorting()).toBe('function');
    });

    test('should sort snapshots alphabetically by name', () => {
      const filter = new SnapshotFilter('');
      const sorting = filter.getSorting();
      const a = createMockSnapshot('alpha');
      const b = createMockSnapshot('beta');
      expect(sorting(a, b)).toBeLessThan(0);
      expect(sorting(b, a)).toBeGreaterThan(0);
      expect(sorting(a, a)).toBe(0);
    });
  });

  describe('clone', () => {
    test('should create independent copy', () => {
      const filter = new SnapshotFilter('test');
      const clone = filter.clone();
      expect(clone.name).toBe('test');
      clone.name = 'changed';
      expect(filter.name).toBe('test');
    });
  });

  describe('equals', () => {
    test('should return true for equal filters', () => {
      const filter1 = new SnapshotFilter('test');
      const filter2 = new SnapshotFilter('test');
      expect(filter1.equals(filter2)).toBe(true);
    });

    test('should return false for different filters', () => {
      const filter1 = new SnapshotFilter('test');
      const filter2 = new SnapshotFilter('other');
      expect(filter1.equals(filter2)).toBe(false);
    });

    test('should return false for null', () => {
      const filter = new SnapshotFilter('test');
      expect(filter.equals(null)).toBe(false);
    });
  });
});
