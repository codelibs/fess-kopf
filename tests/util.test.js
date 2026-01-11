/**
 * Tests for utility functions
 * Tests basic utility functions used throughout fess-kopf
 */

// Load utility code
const fs = require('fs');
const path = require('path');
const utilCode = fs.readFileSync(
  path.join(__dirname, '../src/kopf/util.js'),
  'utf8'
);

// Execute the code to define utility functions
eval(utilCode);

describe('Utility Functions', () => {
  describe('isDefined', () => {
    test('should return false for null', () => {
      expect(isDefined(null)).toBe(false);
    });

    test('should return false for undefined', () => {
      expect(isDefined(undefined)).toBe(false);
    });

    test('should return false with no argument', () => {
      expect(isDefined()).toBe(false);
    });

    test('should return true for defined string', () => {
      expect(isDefined('foobar')).toBe(true);
    });

    test('should return true for defined number', () => {
      expect(isDefined(1)).toBe(true);
      expect(isDefined(0)).toBe(true);
    });

    test('should return true for empty object', () => {
      expect(isDefined({})).toBe(true);
    });

    test('should return true for false boolean', () => {
      expect(isDefined(false)).toBe(true);
    });
  });

  describe('notEmpty', () => {
    test('should return false for null', () => {
      expect(notEmpty(null)).toBe(false);
    });

    test('should return false for undefined', () => {
      expect(notEmpty(undefined)).toBe(false);
    });

    test('should return false with no argument', () => {
      expect(notEmpty()).toBe(false);
    });

    test('should return false for empty string', () => {
      expect(notEmpty('')).toBe(false);
    });

    test('should return true for non-empty string', () => {
      expect(notEmpty('foobar')).toBe(true);
    });

    test('should return true for number', () => {
      expect(notEmpty(1)).toBe(true);
      expect(notEmpty(0)).toBe(true);
    });
  });

  describe('getProperty', () => {
    test('should get property with path as string', () => {
      const obj = {};
      obj['foo.bar.property'] = 'foobar';
      expect(getProperty(obj, 'foo.bar.property')).toBe('foobar');
    });

    test('should get property with nested path', () => {
      const obj = {
        foo: {
          bar: {
            property: 'foobar'
          }
        }
      };
      expect(getProperty(obj, 'foo.bar.property')).toBe('foobar');
    });

    test('should return default value for non-existing property', () => {
      const obj = {};
      expect(getProperty(obj, 'foo.bar.property', 'default')).toBe('default');
    });

    test('should return undefined for non-existing property without default', () => {
      const obj = {};
      expect(getProperty(obj, 'foo.bar.property')).toBeUndefined();
    });
  });

  describe('readablizeBytes', () => {
    test('should format bytes correctly', () => {
      expect(readablizeBytes(1)).toBe('1.00b');
      expect(readablizeBytes(10)).toBe('10.00b');
      expect(readablizeBytes(100)).toBe('100.00b');
      expect(readablizeBytes(1000)).toBe('1000.00b');
    });

    test('should format kilobytes correctly', () => {
      expect(readablizeBytes(10000)).toBe('9.77KB');
      expect(readablizeBytes(100000)).toBe('97.66KB');
      expect(readablizeBytes(1000000)).toBe('976.56KB');
    });

    test('should format megabytes correctly', () => {
      expect(readablizeBytes(10000000)).toBe('9.54MB');
      expect(readablizeBytes(100000000)).toBe('95.37MB');
      expect(readablizeBytes(1000000000)).toBe('953.67MB');
    });

    test('should format gigabytes correctly', () => {
      expect(readablizeBytes(10000000000)).toBe('9.31GB');
      expect(readablizeBytes(100000000000)).toBe('93.13GB');
    });

    test('should format terabytes correctly', () => {
      expect(readablizeBytes(10000000000000)).toBe('9.09TB');
      expect(readablizeBytes(100000000000000)).toBe('90.95TB');
    });

    test('should format petabytes correctly', () => {
      expect(readablizeBytes(10000000000000000)).toBe('8.88PB');
      expect(readablizeBytes(100000000000000000)).toBe('88.82PB');
    });

    test('should return 0 for 0 bytes', () => {
      expect(readablizeBytes(0)).toBe(0);
    });

    test('should return 0 for negative bytes', () => {
      expect(readablizeBytes(-100)).toBe(0);
    });

    test('should handle exact power of 1024', () => {
      expect(readablizeBytes(1024)).toBe('1.00KB');
      expect(readablizeBytes(1048576)).toBe('1.00MB');
      expect(readablizeBytes(1073741824)).toBe('1.00GB');
    });
  });

  describe('isNumber', () => {
    test('should return true for integer string', () => {
      expect(isNumber('123')).toBe(true);
    });

    test('should return true for number', () => {
      expect(isNumber(123)).toBe(true);
    });

    test('should return true for string containing digits', () => {
      expect(isNumber('abc123def')).toBe(true);
    });

    test('should return false for string without digits', () => {
      expect(isNumber('abc')).toBe(false);
    });

    test('should return false for empty string', () => {
      expect(isNumber('')).toBe(false);
    });

    test('should return true for zero', () => {
      expect(isNumber('0')).toBe(true);
      expect(isNumber(0)).toBe(true);
    });

    test('should return true for negative number string', () => {
      expect(isNumber('-123')).toBe(true);
    });

    test('should return true for decimal string', () => {
      expect(isNumber('12.34')).toBe(true);
    });
  });

  describe('getTimeString', () => {
    test('should format time with leading zeros', () => {
      const date = new Date(2024, 0, 1, 9, 5, 3);
      expect(getTimeString(date)).toBe('09:05:03');
    });

    test('should format time without leading zeros needed', () => {
      const date = new Date(2024, 0, 1, 15, 30, 45);
      expect(getTimeString(date)).toBe('15:30:45');
    });

    test('should format midnight', () => {
      const date = new Date(2024, 0, 1, 0, 0, 0);
      expect(getTimeString(date)).toBe('00:00:00');
    });

    test('should format noon', () => {
      const date = new Date(2024, 0, 1, 12, 0, 0);
      expect(getTimeString(date)).toBe('12:00:00');
    });

    test('should format end of day', () => {
      const date = new Date(2024, 0, 1, 23, 59, 59);
      expect(getTimeString(date)).toBe('23:59:59');
    });
  });

  describe('getProperty edge cases', () => {
    test('should handle null object', () => {
      expect(getProperty(null, 'foo', 'default')).toBe('default');
    });

    test('should handle undefined object', () => {
      expect(getProperty(undefined, 'foo', 'default')).toBe('default');
    });

    test('should handle deeply nested property', () => {
      const obj = { a: { b: { c: { d: { e: 'deep' } } } } };
      expect(getProperty(obj, 'a.b.c.d.e')).toBe('deep');
    });

    test('should handle array access', () => {
      const obj = { arr: [1, 2, 3] };
      expect(getProperty(obj, 'arr.1')).toBe(2);
    });

    test('should handle mixed access (property then index)', () => {
      const obj = { items: [{ name: 'first' }, { name: 'second' }] };
      expect(getProperty(obj, 'items.0.name')).toBe('first');
    });

    test('should return default when middle property is undefined', () => {
      const obj = { a: { b: undefined } };
      expect(getProperty(obj, 'a.b.c', 'default')).toBe('default');
    });

    test('should return falsy values correctly', () => {
      const obj = { zero: 0, empty: '', falsy: false };
      expect(getProperty(obj, 'zero')).toBe(0);
      expect(getProperty(obj, 'empty')).toBe('');
      expect(getProperty(obj, 'falsy')).toBe(false);
    });
  });

  describe('isDefined edge cases', () => {
    test('should return true for empty string', () => {
      expect(isDefined('')).toBe(true);
    });

    test('should return true for empty array', () => {
      expect(isDefined([])).toBe(true);
    });

    test('should return true for NaN', () => {
      expect(isDefined(NaN)).toBe(true);
    });

    test('should return true for Infinity', () => {
      expect(isDefined(Infinity)).toBe(true);
    });
  });

  describe('notEmpty edge cases', () => {
    test('should return false for whitespace only string', () => {
      expect(notEmpty('   ')).toBe(false);
    });

    test('should return false for tab and newline', () => {
      expect(notEmpty('\t\n')).toBe(false);
    });

    test('should return true for array', () => {
      expect(notEmpty([1, 2, 3])).toBe(true);
    });

    test('should return true for object', () => {
      expect(notEmpty({ a: 1 })).toBe(true);
    });

    test('should return true for boolean true', () => {
      expect(notEmpty(true)).toBe(true);
    });

    test('should return true for boolean false (toString gives "false")', () => {
      expect(notEmpty(false)).toBe(true);
    });
  });
});
